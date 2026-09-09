"""
OIL-SIF Guardian — Safety Triage & Information Extraction Service.
Transforms raw narratives into calibrated safety intelligence.
"""

import json
import re
from pathlib import Path
from typing import Dict, List

from backend.app.schemas.prediction import (
    EntitiesSchema,
    EvidenceSpanSchema,
    IOGPRulePredictionSchema,
    PSIFSchema,
    SafetyTriageResponse,
)
from ml.extraction.safety_ner import SafetyEntityCategory, SafetyNER
from rules.safety.deterministic_rules import DeterministicSafetyRuleEngine


class SafetyTriageService:
    def __init__(self):
        self.rules_engine = DeterministicSafetyRuleEngine()
        self.ner_engine = SafetyNER()
        self._load_dictionaries()

    def _load_dictionaries(self):
        root_dir = Path(__file__).resolve().parents[3]
        dict_path = root_dir / "rules" / "dictionaries" / "safety_terms.json"
        lsr_path = root_dir / "rules" / "iogp" / "life_saving_rules.json"

        if dict_path.exists():
            with open(dict_path, "r", encoding="utf-8") as f:
                self.safety_terms = json.load(f)
        else:
            self.safety_terms = {"abbreviations": {}, "equipment": [], "hazards": [], "energy_sources": {}}

        if lsr_path.exists():
            with open(lsr_path, "r", encoding="utf-8") as f:
                self.iogp_rules = json.load(f)
        else:
            self.iogp_rules = []

    def normalize_text(self, text: str) -> str:
        """
        Normalizes incident text, sanitizes malicious input, standardizes abbreviations, and redacts PII.
        """
        from backend.app.core.security import sanitize_narrative
        sanitized = sanitize_narrative(text)
        # Redact phone numbers
        sanitized = re.sub(r"\b\d{3}[-.\s]??\d{3}[-.\s]??\d{4}\b", "[PHONE_REDACTED]", sanitized)
        # Redact email addresses
        sanitized = re.sub(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b", "[EMAIL_REDACTED]", sanitized)
        # Clean extra whitespace
        sanitized = re.sub(r"\s+", " ", sanitized).strip()
        return sanitized

    def extract_entities(self, text: str) -> EntitiesSchema:
        """
        Extracts structured safety entities (hazards, energy, exposure, controls, failures).
        """
        lower_text = text.lower()
        hazards = []
        energy_sources = []
        exposures = []
        controls = []
        control_failures = []
        consequences = []

        # Energy sources
        for energy_cat, keywords in self.safety_terms.get("energy_sources", {}).items():
            for kw in keywords:
                if kw in lower_text:
                    energy_sources.append(energy_cat.capitalize())
                    break

        if any(w in lower_text for w in ["pressure", "psi", "bar", "pressurized", "pneumatic", "hydraulic"]):
            energy_sources.append("Pressure")
        if any(w in lower_text for w in ["crane", "suspended", "hoist", "falling", "height", "meters", "elevation"]):
            energy_sources.append("Gravitational")
        if any(w in lower_text for w in ["welding", "torch", "cutting", "grinding", "hot work", "sparks"]):
            energy_sources.append("Thermal")
        if any(w in lower_text for w in ["volt", "kv", "electrical", "switchgear", "breaker", "transformer"]):
            energy_sources.append("Electrical")
        if any(w in lower_text for w in ["h2s", "toxic", "acid", "sour gas", "hydrocarbon", "lpg", "crude"]):
            energy_sources.append("Chemical")
        if any(w in lower_text for w in ["speeding", "km/h", "vehicle", "truck", "winch", "slewing"]):
            energy_sources.append("Kinetic")

        # Hazards & Exposures
        if any(w in lower_text for w in ["tank", "confined space", "vessel", "separator", "pit", "sump", "drum", "manhole"]):
            hazards.append("Confined Space / Hazardous Atmosphere")
            if any(w in lower_text for w in ["entered", "inside", "went in", "entry", "stepped inside", "crawled"]):
                exposures.append("Worker entered inside confined space / vessel")

        if any(w in lower_text for w in ["suspended", "crane", "load", "lifting", "rigging", "hoist"]):
            hazards.append("Suspended Mechanical Load / Rigging Failure")
            if any(w in lower_text for w in ["under", "beneath", "drop zone", "struck by", "swung"]):
                exposures.append("Worker positioned in active drop zone")

        if any(w in lower_text for w in ["height", "scaffold", "derrick", "monkey board", "ladder", "roof", "meters above"]):
            hazards.append("Elevated Fall from Height (>1.8m)")
            exposures.append("Worker at elevated position without complete fall arrest")

        if any(w in lower_text for w in ["pressurized", "gas line", "flowline", "wellhead", "flange", "psi", "bar"]):
            hazards.append("High Pressure Stored Energy Release")

        if any(w in lower_text for w in ["h2s", "toxic", "sour gas"]):
            hazards.append("Toxic Gas / H2S Exposure")

        if any(w in lower_text for w in ["line of fire", "snapback", "trench", "recoil", "pinch point", "whip check"]):
            hazards.append("Line of Fire / Mechanical Stored Energy")

        if any(w in lower_text for w in ["welding", "torch", "grinding", "hot work", "cutting", "spark"]):
            hazards.append("Hot Work Ignition in Hydrocarbon Area")

        if any(w in lower_text for w in ["speeding", "rollover", "tanker", "km/h", "unbelted"]):
            hazards.append("Vehicle Road Transport Collision / Rollover")

        # Controls & Control Failures
        if any(w in lower_text for w in ["gas test", "meter", "lel monitor", "atmospheric test"]):
            controls.append("Atmospheric Gas Testing")
            if any(w in lower_text for w in ["without", "no gas test", "not recorded", "omitted", "skipped", "not calibrated"]):
                control_failures.append("Atmospheric gas testing omitted or unverified")
                consequences.append("Fatal asphyxiation / acute toxic exposure")

        if any(w in lower_text for w in ["permit", "ptw", "work authorization"]):
            controls.append("Permit to Work (PTW)")
            if any(w in lower_text for w in ["expired", "without ptw", "without permit", "rejected", "unauthorized", "self-authorized"]):
                control_failures.append("Work commenced without authorized or valid PTW")

        if any(w in lower_text for w in ["attendant", "hole watch", "standby"]):
            controls.append("Standby Safety Attendant")
            if any(w in lower_text for w in ["no attendant", "without attendant", "absent", "left post", "away"]):
                control_failures.append("Standby attendant absent during confined space entry")

        if any(w in lower_text for w in ["loto", "isolation", "lockout", "tagout"]):
            controls.append("Lockout / Tagout (LOTO) Energy Isolation")
            if any(w in lower_text for w in ["no loto", "not isolated", "isolation failed", "without loto", "not de-energized", "lock not hung"]):
                control_failures.append("Energy isolation not verified / zero energy unconfirmed")
                consequences.append("Uncontrolled high-pressure release / mechanical impact")

        if any(w in lower_text for w in ["harness", "tie-off", "fall arrest", "lifeline"]):
            controls.append("Fall Arrest System / Harness")
            if any(w in lower_text for w in ["no harness", "unhooked", "unclipped", "without harness", "below waist"]):
                control_failures.append("100% tie-off not maintained at height")
                consequences.append("Fatal impact from elevated fall")

        if any(w in lower_text for w in ["fire watch", "extinguisher"]):
            controls.append("Continuous Fire Watch & Gas Monitoring")
            if any(w in lower_text for w in ["no fire watch", "fire watch absent", "without fire watch"]):
                control_failures.append("Fire watch omitted during hot work")

        if any(w in lower_text for w in ["seatbelt", "speed limit", "escort"]):
            controls.append("Journey Management & Vehicle Safety Controls")
            if any(w in lower_text for w in ["speeding", "unbelted", "without seatbelt", "no escort", "phone", "texting"]):
                control_failures.append("Driver speed limit breach or seatbelt non-compliance")

        if any(w in lower_text for w in ["interlock", "safety valve", "esd", "trip", "bypass"]):
            controls.append("Safety Critical Device Integrity")
            if any(w in lower_text for w in ["bypass", "override", "jumper", "gagged", "defeated"]):
                control_failures.append("Safety-critical interlock or trip device defeated")

        # Enrich entities directly from 8-category SafetyNER model
        ner_spans = self.ner_engine.extract_entities(text)
        for span in ner_spans:
            val = span.text.strip()
            if not val:
                continue
            if span.label == SafetyEntityCategory.HAZARD:
                hazards.append(val)
            elif span.label == SafetyEntityCategory.HAZARDOUS_ENERGY:
                energy_sources.append(val)
            elif span.label == SafetyEntityCategory.WORKER_EXPOSURE:
                exposures.append(val)
            elif span.label == SafetyEntityCategory.CRITICAL_CONTROL:
                controls.append(val)
            elif span.label == SafetyEntityCategory.CONTROL_FAILURE:
                control_failures.append(val)
            elif span.label == SafetyEntityCategory.CREDIBLE_CONSEQUENCE:
                consequences.append(val)

        return EntitiesSchema(
            hazards=list(dict.fromkeys(hazards)),
            energy_sources=list(dict.fromkeys(energy_sources)),
            exposures=list(dict.fromkeys(exposures)),
            controls=list(dict.fromkeys(controls)),
            control_failures=list(dict.fromkeys(control_failures)),
            consequences=list(dict.fromkeys(consequences))
        )

    def extract_evidence_spans(self, text: str) -> List[EvidenceSpanSchema]:
        """
        Locates key risk evidence spans with exact character offsets in the narrative,
        combining the 8-category Safety NER engine with domain regex patterns and resolving overlaps.
        """
        raw_spans: List[EvidenceSpanSchema] = []

        # 1. 8-Category Safety NER Engine Spans
        ner_entities = self.ner_engine.extract_entities(text)
        for s in ner_entities:
            cat = "EXPOSURE" if s.label == "WORKER_EXPOSURE" else s.label
            raw_spans.append(EvidenceSpanSchema(
                text=s.text,
                start_char=s.start_char,
                end_char=s.end_char,
                category=cat
            ))

        # 2. Contextual High-Risk Patterns
        patterns = [
            (r"\b(entered\s+the\s+tank|inside\s+the\s+vessel|entered\s+to\s+inspect|stepped\s+inside|worker\s+entered)\b", "EXPOSURE"),
            (r"\b(under(neath)?\s+(the\s+)?suspended\s+load|in\s+line\s+of\s+fire|drop\s+zone)\b", "EXPOSURE"),
            (r"\b(working\s+at\s+height|on\s+the\s+derrick|on\s+scaffold|monkey\s+board)\b", "EXPOSURE"),
            (r"\b(gas\s+testing\s+was\s+not\s+recorded|without\s+continuous\s+atmospheric\s+gas\s+testing|no\s+gas\s+test|without\s+gas\s+test)\b", "CONTROL_FAILURE"),
            (r"\b(permit\s+(had\s+)?expired|expired\s+permit|without\s+(a\s+)?(ptw|permit)|unsigned\s+by)\b", "CONTROL_FAILURE"),
            (r"\b(standby\s+attendant\s+was\s+absent|no\s+attendant|unattended|attendant\s+had\s+left)\b", "CONTROL_FAILURE"),
            (r"\b(isolation\s+failed|not\s+isolated|without\s+loto|no\s+loto|before\s+closing\s+isolation|positive\s+isolation\s+blind)\b", "CONTROL_FAILURE"),
            (r"\b(without\s+safety\s+harness|harness\s+not\s+anchored|unclipped|unhooked)\b", "CONTROL_FAILURE"),
            (r"\b(pressurized\s+gas\s+line|stored\s+energy|high\s+pressure|\d+\s*psi|\d+\s*bar)\b", "HAZARD"),
            (r"\b(welding|hot\s+work|torch|grinding)\b", "HAZARD"),
            (r"\b(bypassed|jumper\s+wire|override|gagged)\b", "CONTROL_FAILURE"),
            (r"\b(speeding|texting\s+on\s+phone|without\s+seatbelts?|unbelted)\b", "CONTROL_FAILURE")
        ]

        for pattern, category in patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                raw_spans.append(EvidenceSpanSchema(
                    text=match.group(0),
                    start_char=match.start(),
                    end_char=match.end(),
                    category=category
                ))

        # 3. Sort by start_char ascending, then length descending, and resolve overlapping spans
        raw_spans.sort(key=lambda s: (s.start_char, -(s.end_char - s.start_char)))

        non_overlapping: List[EvidenceSpanSchema] = []
        last_end = -1
        for candidate in raw_spans:
            if candidate.start_char >= last_end:
                non_overlapping.append(candidate)
                last_end = candidate.end_char

        return non_overlapping

    def predict_iogp_rules(self, text: str, suggested_rules: List[str], is_benign: bool = False) -> List[IOGPRulePredictionSchema]:
        """
        Maps the 9 IOGP Life-Saving Rules with calibrated probabilities.
        """
        if is_benign or not suggested_rules:
            return []

        lower_text = text.lower()
        rule_scores: Dict[str, float] = {}

        for r in self.iogp_rules:
            name = r["name"]
            score = 0.05
            if name in suggested_rules:
                idx = suggested_rules.index(name)
                score = 0.95 if idx == 0 else 0.85
            else:
                for kw in r.get("keywords", []):
                    if kw in lower_text:
                        score = max(score, 0.45)
            rule_scores[name] = score

        results = []
        sorted_rules = sorted(rule_scores.items(), key=lambda x: x[1], reverse=True)
        primary_assigned = False

        for name, prob in sorted_rules:
            if prob >= 0.40:
                is_prim = (not primary_assigned and prob >= 0.70)
                if is_prim:
                    primary_assigned = True
                results.append(IOGPRulePredictionSchema(
                    rule_name=name,
                    probability=round(prob, 2),
                    is_primary=is_prim
                ))

        return results

    def build_fingerprint(self, activity: str, entities: EntitiesSchema, primary_rule: str) -> str:
        """
        Builds standardized SIF Exposure Fingerprint tuple.
        """
        act = (activity or "OPERATIONS").upper().replace(" ", "_")
        energy = (entities.energy_sources[0] if entities.energy_sources else "ENERGY_HAZARD").upper()
        hazard = (entities.hazards[0] if entities.hazards else "HAZARD").upper().replace(" ", "_")[:20]
        failure = (entities.control_failures[0] if entities.control_failures else "BARRIER_FAILURE").upper().replace(" ", "_")[:24]
        rule = (primary_rule or "NONE").upper().replace(" ", "_")
        return f"{act}|{energy}|{hazard}|{failure}|{rule}"

    def triage(self, narrative: str, activity: str = "Maintenance") -> SafetyTriageResponse:
        """
        Executes complete hybrid triage pipeline.
        """
        normalized = self.normalize_text(narrative)
        entities = self.extract_entities(normalized)
        spans = self.extract_evidence_spans(normalized)
        rule_eval = self.rules_engine.evaluate(normalized)

        is_benign = rule_eval.get("is_benign", False)
        iogp_preds = self.predict_iogp_rules(normalized, rule_eval["suggested_rules"], is_benign=is_benign)
        primary_rule = iogp_preds[0].rule_name if iogp_preds else None

        # Calculate hybrid PSIF probability
        if rule_eval["mandatory_high_psif"]:
            psif_prob = 0.94
            priority = "HIGH"
            confidence = "HIGH"
        elif is_benign:
            psif_prob = 0.05
            priority = "LOW"
            confidence = "HIGH"
        elif len(entities.control_failures) > 0 and len(entities.energy_sources) > 0:
            psif_prob = 0.82
            priority = "HIGH"
            confidence = "HIGH"
        elif len(entities.control_failures) > 0 or len(entities.hazards) > 0 or len(rule_eval["suggested_rules"]) > 0:
            psif_prob = 0.58
            priority = "REVIEW"
            confidence = "MEDIUM"
        else:
            psif_prob = 0.15
            priority = "LOW"
            confidence = "HIGH"

        # Construct structured safety reasoning
        reasoning = []
        if is_benign:
            reasoning.append("Routine administrative or benign non-industrial activity without safety precursor risk.")
        else:
            if entities.hazards:
                reasoning.append(f"Hazard context identified: {', '.join(entities.hazards)}.")
            if entities.energy_sources:
                reasoning.append(f"Hazardous energy vectors involved: {', '.join(entities.energy_sources)}.")
            if entities.exposures:
                reasoning.append(f"Direct personnel exposure: {', '.join(entities.exposures)}.")
            if entities.control_failures:
                reasoning.append(f"Critical barrier breakdown: {', '.join(entities.control_failures)}.")
            if rule_eval["rule_reasons"]:
                reasoning.extend(rule_eval["rule_reasons"])
            if not reasoning:
                reasoning.append("Operational safety narrative with no critical control breakdown identified.")

        fingerprint = self.build_fingerprint(activity, entities, primary_rule or "NONE")

        return SafetyTriageResponse(
            psif=PSIFSchema(
                probability=psif_prob,
                priority=priority,
                confidence=confidence,
                calibration_factor=1.0
            ),
            life_saving_rules=iogp_preds,
            entities=entities,
            evidence_spans=spans,
            triggered_rules=rule_eval["triggered_rules"],
            safety_reasoning=reasoning,
            exposure_fingerprint=fingerprint,
            model_version="psif-v1.0"
        )


triage_service = SafetyTriageService()
