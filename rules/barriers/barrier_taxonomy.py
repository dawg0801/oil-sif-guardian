"""
OIL-SIF Guardian — Hierarchical Barrier Taxonomy & Degradation Framework
Codifies Hardware (Engineered), Administrative (Procedural), and Human Action (Behavioral)
barriers and evaluates barrier health degradation according to IOGP and Swiss Cheese models.
"""

import re
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List


class BarrierCategory(str, Enum):
    HARDWARE = "HARDWARE"          # Engineered barriers (valves, BOP, PSV, interlocks, sensors)
    ADMINISTRATIVE = "ADMINISTRATIVE"  # Procedural barriers (PTW, JSA, LOTO, MOC)
    HUMAN_ACTION = "HUMAN_ACTION"  # Behavioral barriers (watchers, 100% tie-off, banksman)


class BarrierState(str, Enum):
    EFFECTIVE = "EFFECTIVE"      # Barrier in place, tested, functioning properly
    DEGRADED = "DEGRADED"        # Barrier present but leaking, worn, or sub-optimal
    FAILED = "FAILED"            # Barrier physically ruptured, fractured, or failed under load
    BYPASSED = "BYPASSED"        # Barrier intentionally defeated, overridden, jumpered, or gagged
    ABSENT = "ABSENT"            # Mandatory barrier was completely omitted / missing


@dataclass
class BarrierDefinition:
    id: str
    name: str
    category: BarrierCategory
    sub_type: str
    description: str
    iogp_rule_association: str


@dataclass
class DetectedBarrier:
    barrier_id: str
    name: str
    category: BarrierCategory
    sub_type: str
    state: BarrierState
    evidence: str
    severity_weight: float  # 1.0 = standard, 2.0 = critical life-saving barrier


@dataclass
class BarrierAnalysisResult:
    detected_barriers: List[DetectedBarrier]
    barrier_health_score: float  # 0.0 (total barrier breakdown) to 1.0 (fully intact)
    has_critical_failure: bool
    summary_by_category: Dict[str, Dict[str, int]]
    failure_mechanisms: List[str]
    sif_barrier_flag: str  # CRITICAL_FAILURE, DEGRADED, EFFECTIVE, NONE_DETECTED


class BarrierAnalyzer:
    """
    Parses and evaluates oilfield safety narratives against codified
    hierarchical barrier taxonomies and determines degradation states.
    """

    BARRIER_CATALOG: Dict[str, BarrierDefinition] = {
        # Hardware Barriers
        "HW-CONT-01": BarrierDefinition(
            id="HW-CONT-01",
            name="Primary Pressure Containment (Piping / Flange / Vessel)",
            category=BarrierCategory.HARDWARE,
            sub_type="Containment",
            description="Pressure-retaining envelope including flanges, seals, gaskets, and vessels.",
            iogp_rule_association="Energy Isolation"
        ),
        "HW-BOP-01": BarrierDefinition(
            id="HW-BOP-01",
            name="Blowout Preventer (BOP) & Well Control Stack",
            category=BarrierCategory.HARDWARE,
            sub_type="Secondary Containment",
            description="Annular preventer, pipe rams, blind shear rams, and choke manifold.",
            iogp_rule_association="Bypassing Safety Controls"
        ),
        "HW-RELIEF-01": BarrierDefinition(
            id="HW-RELIEF-01",
            name="Pressure Relief Device (PSV / Rupture Disc / ESD)",
            category=BarrierCategory.HARDWARE,
            sub_type="Overpressure Protection",
            description="Automatic relief valves, burst discs, emergency shutdown interlocks.",
            iogp_rule_association="Bypassing Safety Controls"
        ),
        "HW-F&G-01": BarrierDefinition(
            id="HW-F&G-01",
            name="Fire and Gas Detection (H2S / LEL Detectors)",
            category=BarrierCategory.HARDWARE,
            sub_type="Detection & Warning",
            description="Continuous fixed and portable atmospheric monitoring instrumentation.",
            iogp_rule_association="Confined Space"
        ),
        "HW-REST-01": BarrierDefinition(
            id="HW-REST-01",
            name="Physical Restraint (Whip Check / Safety Clamps / Guardrails)",
            category=BarrierCategory.HARDWARE,
            sub_type="Physical Restraint",
            description="Whip checks on pressurized hoses, crown-o-matic, safety toe-boards.",
            iogp_rule_association="Line of Fire"
        ),

        # Administrative Barriers
        "AD-PTW-01": BarrierDefinition(
            id="AD-PTW-01",
            name="Permit to Work (PTW / Hot Work / Confined Space Permit)",
            category=BarrierCategory.ADMINISTRATIVE,
            sub_type="Authorization",
            description="Formal authorization verifying hazards assessed and controls approved.",
            iogp_rule_association="Work Authorization"
        ),
        "AD-LOTO-01": BarrierDefinition(
            id="AD-LOTO-01",
            name="Lockout / Tagout & Energy Isolation Procedure",
            category=BarrierCategory.ADMINISTRATIVE,
            sub_type="Isolation Protocol",
            description="LOTO padlock, lockout tag, DBB line isolation, and zero-energy test.",
            iogp_rule_association="Energy Isolation"
        ),
        "AD-JSA-01": BarrierDefinition(
            id="AD-JSA-01",
            name="Job Safety Analysis (JSA / JHA) & Toolbox Talk",
            category=BarrierCategory.ADMINISTRATIVE,
            sub_type="Risk Assessment",
            description="Pre-job hazard evaluation and pre-tour crew safety briefing.",
            iogp_rule_association="Work Authorization"
        ),
        "AD-MOC-01": BarrierDefinition(
            id="AD-MOC-01",
            name="Management of Change (MOC) & Authorization",
            category=BarrierCategory.ADMINISTRATIVE,
            sub_type="Procedural Governance",
            description="Approved engineering or operational deviation review prior to defeat.",
            iogp_rule_association="Bypassing Safety Controls"
        ),

        # Human Action Barriers
        "HA-WATCH-01": BarrierDefinition(
            id="HA-WATCH-01",
            name="Dedicated Safety Watcher (Standby Attendant / Fire Watch)",
            category=BarrierCategory.HUMAN_ACTION,
            sub_type="Active Human Oversight",
            description="Continuous stationed safety observer for confined space or hot work.",
            iogp_rule_association="Confined Space"
        ),
        "HA-RIGG-01": BarrierDefinition(
            id="HA-RIGG-01",
            name="Dedicated Banksman & Lift Marshal",
            category=BarrierCategory.HUMAN_ACTION,
            sub_type="Active Human Oversight",
            description="Trained signalman directing crane movement and enforcing exclusion zones.",
            iogp_rule_association="Safe Mechanical Lifting"
        ),
        "HA-TIEOFF-01": BarrierDefinition(
            id="HA-TIEOFF-01",
            name="100% Tie-Off at Height with Full Body Harness",
            category=BarrierCategory.HUMAN_ACTION,
            sub_type="Personal Protective Action",
            description="Continuous dual lanyard anchorage above 1.8 meters.",
            iogp_rule_association="Working at Height"
        ),
        "HA-POS-01": BarrierDefinition(
            id="HA-POS-01",
            name="Exclusion Zone Positioning & Line-of-Fire Clearance",
            category=BarrierCategory.HUMAN_ACTION,
            sub_type="Personal Protective Action",
            description="Worker maintaining safe standoff distance away from drop zones or pressurized lines.",
            iogp_rule_association="Line of Fire"
        ),
    }

    def __init__(self):
        self._compile_barrier_patterns()

    def _compile_barrier_patterns(self):
        # 1. Primary Containment / Flange / Gasket
        self.p_cont_pres = re.compile(r"\b(flange\w*|gasket\w*|pressure\s+line|flowline\w*|pipe\w*|casing\w*|tubing\w*|manifold\w*)\b", re.IGNORECASE)
        self.p_cont_fail = re.compile(r"\b(blowout|gasket\s+rupture|blew\s+out|pinhole|ruptured|cracked|leaked|failed\s+hydro|burst)\b", re.IGNORECASE)
        self.p_cont_deg = re.compile(r"\b(seeping|weeping|slight\s+drip|corroded|thinning|vibrating\s+excessively)\b", re.IGNORECASE)

        # 2. BOP & Well Control
        self.p_bop_pres = re.compile(r"\b(bop|blowout\s+preventer|annular|shear\s+ram|blind\s+ram|choke\s+manifold)\b", re.IGNORECASE)
        self.p_bop_fail = re.compile(r"\b(failed\s+to\s+close|accumulator\s+empty|leaking\s+rams|rams\s+cut|unable\s+to\s+seal)\b", re.IGNORECASE)
        self.p_bop_byp = re.compile(r"\b(bypassed|interlock\s+defeated|accumulator\s+bottle\s+isolated)\b", re.IGNORECASE)

        # 3. PSV / ESD / Relief Valves
        self.p_rel_pres = re.compile(r"\b(psv|prv|relief\s+valve|safety\s+valve|esd|emergency\s+shutdown|trip\s+valve)\b", re.IGNORECASE)
        self.p_rel_byp = re.compile(r"\b(gagged|jumpered|bypassed|inhibited|tied\s+off|defeated|silenced|blinded\s+off)\b", re.IGNORECASE)
        self.p_rel_fail = re.compile(r"\b(failed\s+to\s+lift|stuck\s+closed|chattered|overpressured\s+without\s+popping)\b", re.IGNORECASE)

        # 4. Fire & Gas / H2S Sensors
        self.p_fg_pres = re.compile(r"\b(gas\s+test\w*|gas\s+detector|meter|h2s\s+sensor|lel\s+monitor|multigas)\b", re.IGNORECASE)
        self.p_fg_abs = re.compile(r"\b(without\s+(continuous\s+)?(gas\s+test|monitoring)|no\s+gas\s+test|omitted\s+gas\s+test|gas\s+test.*not\s+recorded)\b", re.IGNORECASE)
        self.p_fg_fail = re.compile(r"\b(out\s+of\s+calibration|sensor\s+poisoned|battery\s+dead|drifted|failed\s+bump\s+test)\b", re.IGNORECASE)

        # 5. Physical Restraints / Whip Checks
        self.p_rest_pres = re.compile(r"\b(whip\s*check\w*|hose\s+restraint|crown-o-matic|toe\s*board|handrail\w*)\b", re.IGNORECASE)
        self.p_rest_abs = re.compile(r"\b(no\s+whip\s*check|without\s+whip\s*check|whip\s*check\s+absent|unrestrained\s+hose)\b", re.IGNORECASE)
        self.p_rest_fail = re.compile(r"\b(whip\s*check\s+parted|cable\s+snapped|snubbing\s+line\s+broke)\b", re.IGNORECASE)
        self.p_rest_byp = re.compile(r"\b(crown-o-matic.*(bypassed|tied|defeated))\b", re.IGNORECASE)

        # 6. Permit to Work (PTW)
        self.p_ptw_pres = re.compile(r"\b(ptw|permit|cold\s+work\s+permit|hot\s+work\s+permit|entry\s+permit)\b", re.IGNORECASE)
        self.p_ptw_abs = re.compile(r"\b(without\s+(a\s+)?(ptw|permit|valid\s+permit)|no\s+(ptw|permit)|unauthorized\s+work)\b", re.IGNORECASE)
        self.p_ptw_fail = re.compile(r"\b(expired\s+permit|permit.*expired|scope\s+deviation|permit\s+rejected)\b", re.IGNORECASE)
        self.p_ptw_byp = re.compile(r"\b(self-authorized|forged\s+signature|signed\s+both\s+issuer\s+and\s+performer)\b", re.IGNORECASE)

        # 7. LOTO / Energy Isolation
        self.p_loto_pres = re.compile(r"\b(loto|lockout|tagout|isolation|double\s+block|dbb|blind\s+flange|spade)\b", re.IGNORECASE)
        self.p_loto_abs = re.compile(r"\b(without\s+(loto|isolation|closing|lock|tag)|no\s+loto|unisolated|lock\s+not\s+hung)\b", re.IGNORECASE)
        self.p_loto_fail = re.compile(r"\b(isolation\s+failed|leaking\s+past\s+valve|passing\s+valve|residual\s+pressure|blew\s+past\s+seat)\b", re.IGNORECASE)
        self.p_loto_byp = re.compile(r"\b(unlocked\s+without\s+permit|cut\s+padlock|master\s+key\s+override)\b", re.IGNORECASE)

        # 8. JSA & Toolbox Talk
        self.p_jsa_pres = re.compile(r"\b(jsa|jha|job\s+safety\s+analysis|toolbox\s+talk|tbt|pre-job\s+meeting)\b", re.IGNORECASE)
        self.p_jsa_abs = re.compile(r"\b(without\s+jsa|no\s+jsa|no\s+toolbox\s+talk|skipped\s+toolbox|not\s+briefed)\b", re.IGNORECASE)

        # 9. Watchers (Standby Attendant / Fire Watch)
        self.p_watch_pres = re.compile(r"\b(standby\s+attendant|hole\s+watch|fire\s+watch|safety\s+observer)\b", re.IGNORECASE)
        self.p_watch_abs = re.compile(r"\b(no\s+attendant|attendant.*(absent|left|away)|without\s+(a\s+)?(attendant|fire\s+watch)|fire\s+watch.*absent)\b", re.IGNORECASE)

        # 10. Banksman / Rigger
        self.p_rigg_pres = re.compile(r"\b(banksman|rigger|signalman|lift\s+director|ground\s+marshal)\b", re.IGNORECASE)
        self.p_rigg_abs = re.compile(r"\b(without\s+(a\s+)?banksman|no\s+banksman|no\s+signalman|unassisted\s+blind\s+lift|ground\s+marshal.*not\s+deployed)\b", re.IGNORECASE)

        # 11. 100% Tie-off at Height
        self.p_tie_pres = re.compile(r"\b(safety\s+harness|fall\s+arrest|lanyard|lifeline|tie-?off|anchorage)\b", re.IGNORECASE)
        self.p_tie_abs = re.compile(r"\b(without\s+(a\s+)?harness|no\s+harness|unclipped|unhooked|harness.*not\s+(anchored|clipped)|below\s+waist)\b", re.IGNORECASE)

        # 12. Safe Positioning / Drop Zone Clearance
        self.p_pos_pres = re.compile(r"\b(exclusion\s+zone|drop\s+zone|line\s+of\s+fire|safe\s+distance|barricade)\b", re.IGNORECASE)
        self.p_pos_fail = re.compile(r"\b(under(neath)?\s+(the\s+)?suspended\s+load|in\s+line\s+of\s+fire|in\s+drop\s+zone|stood\s+beneath|in\s+trajectory|snapback\s+zone)\b", re.IGNORECASE)

    def analyze(self, narrative: str) -> BarrierAnalysisResult:
        """
        Scans incident text, identifies all manifested barriers, and classifies their degradation status.
        """
        text = narrative.lower()
        detected: List[DetectedBarrier] = []
        failure_mechanisms: List[str] = []

        # 1. Primary Containment
        if self.p_cont_pres.search(text):
            if self.p_cont_fail.search(text):
                detected.append(DetectedBarrier(
                    barrier_id="HW-CONT-01",
                    name=self.BARRIER_CATALOG["HW-CONT-01"].name,
                    category=BarrierCategory.HARDWARE,
                    sub_type="Containment",
                    state=BarrierState.FAILED,
                    evidence="Physical rupture / blowout of pressure-retaining seal or line",
                    severity_weight=2.0
                ))
                failure_mechanisms.append("Primary containment envelope breached under operational pressure.")
            elif self.p_cont_deg.search(text):
                detected.append(DetectedBarrier(
                    barrier_id="HW-CONT-01",
                    name=self.BARRIER_CATALOG["HW-CONT-01"].name,
                    category=BarrierCategory.HARDWARE,
                    sub_type="Containment",
                    state=BarrierState.DEGRADED,
                    evidence="Minor seepage or degradation on pressurized equipment",
                    severity_weight=1.2
                ))
            else:
                detected.append(DetectedBarrier(
                    barrier_id="HW-CONT-01",
                    name=self.BARRIER_CATALOG["HW-CONT-01"].name,
                    category=BarrierCategory.HARDWARE,
                    sub_type="Containment",
                    state=BarrierState.EFFECTIVE,
                    evidence="Containment barrier present and intact",
                    severity_weight=1.0
                ))

        # 2. PSV / ESD / Relief Valves
        if self.p_rel_pres.search(text):
            if self.p_rel_byp.search(text):
                detected.append(DetectedBarrier(
                    barrier_id="HW-RELIEF-01",
                    name=self.BARRIER_CATALOG["HW-RELIEF-01"].name,
                    category=BarrierCategory.HARDWARE,
                    sub_type="Overpressure Protection",
                    state=BarrierState.BYPASSED,
                    evidence="Safety valve or emergency shutdown device gagged/jumpered/overridden",
                    severity_weight=2.0
                ))
                failure_mechanisms.append("Overpressure protection intentionally bypassed or gagged.")
            elif self.p_rel_fail.search(text):
                detected.append(DetectedBarrier(
                    barrier_id="HW-RELIEF-01",
                    name=self.BARRIER_CATALOG["HW-RELIEF-01"].name,
                    category=BarrierCategory.HARDWARE,
                    sub_type="Overpressure Protection",
                    state=BarrierState.FAILED,
                    evidence="Relief valve failed to lift at set pressure",
                    severity_weight=2.0
                ))
                failure_mechanisms.append("Relief valve mechanical failure during pressure excursion.")

        # 3. BOP Stack
        if self.p_bop_pres.search(text):
            if self.p_bop_byp.search(text):
                detected.append(DetectedBarrier(
                    barrier_id="HW-BOP-01",
                    name=self.BARRIER_CATALOG["HW-BOP-01"].name,
                    category=BarrierCategory.HARDWARE,
                    sub_type="Secondary Containment",
                    state=BarrierState.BYPASSED,
                    evidence="BOP control system interlock bypassed",
                    severity_weight=2.0
                ))
                failure_mechanisms.append("Well control BOP safety system bypassed.")
            elif self.p_bop_fail.search(text):
                detected.append(DetectedBarrier(
                    barrier_id="HW-BOP-01",
                    name=self.BARRIER_CATALOG["HW-BOP-01"].name,
                    category=BarrierCategory.HARDWARE,
                    sub_type="Secondary Containment",
                    state=BarrierState.FAILED,
                    evidence="BOP rams failed to seal during well kick",
                    severity_weight=2.0
                ))
                failure_mechanisms.append("Well control BOP failed to isolate wellbore pressure.")

        # 4. Fire & Gas / Atmospheric Testing
        if self.p_fg_abs.search(text) or ("confined space" in text and "gas test" in text and any(w in text for w in ["without", "omitted", "no"])):
            detected.append(DetectedBarrier(
                barrier_id="HW-F&G-01",
                name=self.BARRIER_CATALOG["HW-F&G-01"].name,
                category=BarrierCategory.HARDWARE,
                sub_type="Detection & Warning",
                state=BarrierState.ABSENT,
                evidence="Mandatory atmospheric gas monitoring omitted or unrecorded",
                severity_weight=2.0
            ))
            failure_mechanisms.append("Atmospheric monitoring completely omitted before entry into hazardous space.")
        elif self.p_fg_pres.search(text):
            if self.p_fg_fail.search(text):
                detected.append(DetectedBarrier(
                    barrier_id="HW-F&G-01",
                    name=self.BARRIER_CATALOG["HW-F&G-01"].name,
                    category=BarrierCategory.HARDWARE,
                    sub_type="Detection & Warning",
                    state=BarrierState.FAILED,
                    evidence="Gas detector out of calibration or unserviceable",
                    severity_weight=1.8
                ))
                failure_mechanisms.append("Gas detector out of calibration / failed bump test.")
            else:
                detected.append(DetectedBarrier(
                    barrier_id="HW-F&G-01",
                    name=self.BARRIER_CATALOG["HW-F&G-01"].name,
                    category=BarrierCategory.HARDWARE,
                    sub_type="Detection & Warning",
                    state=BarrierState.EFFECTIVE,
                    evidence="Gas testing performed and verified",
                    severity_weight=1.0
                ))

        # 5. Physical Restraints (Whip check / Crown-o-matic)
        if self.p_rest_abs.search(text):
            detected.append(DetectedBarrier(
                barrier_id="HW-REST-01",
                name=self.BARRIER_CATALOG["HW-REST-01"].name,
                category=BarrierCategory.HARDWARE,
                sub_type="Physical Restraint",
                state=BarrierState.ABSENT,
                evidence="High pressure hose operated without whip check safety cable",
                severity_weight=1.8
            ))
            failure_mechanisms.append("High pressure line operated without mandatory whip check.")
        elif self.p_rest_byp.search(text):
            detected.append(DetectedBarrier(
                barrier_id="HW-REST-01",
                name=self.BARRIER_CATALOG["HW-REST-01"].name,
                category=BarrierCategory.HARDWARE,
                sub_type="Physical Restraint",
                state=BarrierState.BYPASSED,
                evidence="Crown-o-matic rig crown saver bypassed or defeated",
                severity_weight=2.0
            ))
            failure_mechanisms.append("Rig crown saver physical barrier deliberately defeated.")
        elif self.p_rest_fail.search(text):
            detected.append(DetectedBarrier(
                barrier_id="HW-REST-01",
                name=self.BARRIER_CATALOG["HW-REST-01"].name,
                category=BarrierCategory.HARDWARE,
                sub_type="Physical Restraint",
                state=BarrierState.FAILED,
                evidence="Whip check safety cable snapped under high pressure impulse",
                severity_weight=1.8
            ))
            failure_mechanisms.append("Restraining cable suffered structural rupture.")

        # 6. Permit to Work (PTW)
        if self.p_ptw_abs.search(text):
            detected.append(DetectedBarrier(
                barrier_id="AD-PTW-01",
                name=self.BARRIER_CATALOG["AD-PTW-01"].name,
                category=BarrierCategory.ADMINISTRATIVE,
                sub_type="Authorization",
                state=BarrierState.ABSENT,
                evidence="Work commenced without an authorized Permit to Work",
                severity_weight=1.8
            ))
            failure_mechanisms.append("Mandatory Work Authorization absent prior to task commencement.")
        elif self.p_ptw_byp.search(text):
            detected.append(DetectedBarrier(
                barrier_id="AD-PTW-01",
                name=self.BARRIER_CATALOG["AD-PTW-01"].name,
                category=BarrierCategory.ADMINISTRATIVE,
                sub_type="Authorization",
                state=BarrierState.BYPASSED,
                evidence="Self-authorized or bypassed permit validation workflow",
                severity_weight=1.8
            ))
            failure_mechanisms.append("Work authorization circumvented via self-authorization.")
        elif self.p_ptw_fail.search(text):
            detected.append(DetectedBarrier(
                barrier_id="AD-PTW-01",
                name=self.BARRIER_CATALOG["AD-PTW-01"].name,
                category=BarrierCategory.ADMINISTRATIVE,
                sub_type="Authorization",
                state=BarrierState.FAILED,
                evidence="Work performed under expired permit or scope mismatch",
                severity_weight=1.5
            ))
            failure_mechanisms.append("Permit to Work expired or scope breached.")

        # 7. LOTO / Energy Isolation
        if self.p_loto_abs.search(text):
            detected.append(DetectedBarrier(
                barrier_id="AD-LOTO-01",
                name=self.BARRIER_CATALOG["AD-LOTO-01"].name,
                category=BarrierCategory.ADMINISTRATIVE,
                sub_type="Isolation Protocol",
                state=BarrierState.ABSENT,
                evidence="Intervention commenced without LOTO or verified zero energy state",
                severity_weight=2.0
            ))
            failure_mechanisms.append("Mandatory Lockout/Tagout isolation omitted.")
        elif self.p_loto_fail.search(text):
            detected.append(DetectedBarrier(
                barrier_id="AD-LOTO-01",
                name=self.BARRIER_CATALOG["AD-LOTO-01"].name,
                category=BarrierCategory.ADMINISTRATIVE,
                sub_type="Isolation Protocol",
                state=BarrierState.FAILED,
                evidence="Isolation valve leaking or unvented residual pressure trapped behind valve",
                severity_weight=2.0
            ))
            failure_mechanisms.append("Energy isolation failed due to passing valve or trapped residual energy.")

        # 8. JSA / Toolbox Briefing
        if self.p_jsa_abs.search(text):
            detected.append(DetectedBarrier(
                barrier_id="AD-JSA-01",
                name=self.BARRIER_CATALOG["AD-JSA-01"].name,
                category=BarrierCategory.ADMINISTRATIVE,
                sub_type="Risk Assessment",
                state=BarrierState.ABSENT,
                evidence="Task initiated without JSA or pre-job safety talk",
                severity_weight=1.2
            ))
            failure_mechanisms.append("Pre-job risk assessment omitted.")

        # 9. Dedicated Watchers
        if self.p_watch_abs.search(text) or ("confined space" in text and any(w in text for w in ["attendant absent", "no attendant", "left his post"])):
            detected.append(DetectedBarrier(
                barrier_id="HA-WATCH-01",
                name=self.BARRIER_CATALOG["HA-WATCH-01"].name,
                category=BarrierCategory.HUMAN_ACTION,
                sub_type="Active Human Oversight",
                state=BarrierState.ABSENT,
                evidence="Dedicated safety attendant / hole watch absent from entry point",
                severity_weight=2.0
            ))
            failure_mechanisms.append("Mandatory standby attendant deserted post or was unassigned.")

        # 10. Banksman / Rigger
        if self.p_rigg_abs.search(text):
            detected.append(DetectedBarrier(
                barrier_id="HA-RIGG-01",
                name=self.BARRIER_CATALOG["HA-RIGG-01"].name,
                category=BarrierCategory.HUMAN_ACTION,
                sub_type="Active Human Oversight",
                state=BarrierState.ABSENT,
                evidence="Critical lift conducted without certified banksman or signalman",
                severity_weight=1.8
            ))
            failure_mechanisms.append("Critical lift operated without designated banksman.")

        # 11. 100% Tie-Off at Height
        if self.p_tie_abs.search(text) or ("working at height" in text and any(w in text for w in ["unclipped", "unhooked", "no harness"])):
            detected.append(DetectedBarrier(
                barrier_id="HA-TIEOFF-01",
                name=self.BARRIER_CATALOG["HA-TIEOFF-01"].name,
                category=BarrierCategory.HUMAN_ACTION,
                sub_type="Personal Protective Action",
                state=BarrierState.ABSENT,
                evidence="Worker at height >1.8m without 100% tie-off or anchored fall arrest",
                severity_weight=2.0
            ))
            failure_mechanisms.append("100% tie-off not maintained at elevated height.")

        # 12. Safe Positioning & Drop Zone Clearance
        if self.p_pos_fail.search(text):
            detected.append(DetectedBarrier(
                barrier_id="HA-POS-01",
                name=self.BARRIER_CATALOG["HA-POS-01"].name,
                category=BarrierCategory.HUMAN_ACTION,
                sub_type="Personal Protective Action",
                state=BarrierState.FAILED,
                evidence="Personnel positioned in active drop zone or directly in line of fire",
                severity_weight=2.0
            ))
            failure_mechanisms.append("Personnel breached exclusion zone into line of fire / drop zone.")

        # Calculate Barrier Health Index
        # Each effective barrier contributes positive health, each degraded/failed/bypassed/absent penalizes.
        if not detected:
            health_score = 1.0
            has_critical = False
            sif_flag = "NONE_DETECTED"
        else:
            total_penalty = 0.0
            total_possible = sum(b.severity_weight for b in detected)
            has_critical = False

            for b in detected:
                if b.state in (BarrierState.FAILED, BarrierState.BYPASSED, BarrierState.ABSENT):
                    total_penalty += b.severity_weight
                    if b.severity_weight >= 1.8:
                        has_critical = True
                elif b.state == BarrierState.DEGRADED:
                    total_penalty += 0.5 * b.severity_weight

            health_score = max(0.0, round(1.0 - (total_penalty / total_possible), 2)) if total_possible > 0 else 1.0

            if has_critical or health_score <= 0.40:
                sif_flag = "CRITICAL_FAILURE"
            elif health_score <= 0.75:
                sif_flag = "DEGRADED"
            else:
                sif_flag = "EFFECTIVE"

        # Categorical Breakdown
        cat_summary: Dict[str, Dict[str, int]] = {
            BarrierCategory.HARDWARE.value: {"total": 0, "failed": 0, "effective": 0},
            BarrierCategory.ADMINISTRATIVE.value: {"total": 0, "failed": 0, "effective": 0},
            BarrierCategory.HUMAN_ACTION.value: {"total": 0, "failed": 0, "effective": 0},
        }

        for b in detected:
            cat_key = b.category.value
            cat_summary[cat_key]["total"] += 1
            if b.state in (BarrierState.FAILED, BarrierState.BYPASSED, BarrierState.ABSENT, BarrierState.DEGRADED):
                cat_summary[cat_key]["failed"] += 1
            else:
                cat_summary[cat_key]["effective"] += 1

        return BarrierAnalysisResult(
            detected_barriers=detected,
            barrier_health_score=health_score,
            has_critical_failure=has_critical,
            summary_by_category=cat_summary,
            failure_mechanisms=list(dict.fromkeys(failure_mechanisms)),
            sif_barrier_flag=sif_flag
        )


barrier_analyzer = BarrierAnalyzer()
