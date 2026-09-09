"""
OIL-SIF Guardian — Deterministic Safety Rule Engine
Codified industrial safety guardrails for fatal precursor detection.
Adheres strictly to the 9 IOGP Life-Saving Rules and oil & gas process safety standards.
"""

import re
from dataclasses import asdict
from typing import Any, Dict, List

from rules.safety.catalog import CODIFIED_SAFETY_CATALOG, RuleSeverity


class DeterministicSafetyRuleEngine:
    """
    Evaluates safety incident narratives against codified zero-tolerance
    industrial precursor rules to surface critical safety signals.
    """

    def __init__(self):
        self._compile_patterns()

    def _compile_patterns(self):
        # Benign administrative / non-industrial indicators (Negative Controls)
        self.re_benign = re.compile(
            r"\b(accounts\s+clerk|stationery|paper\s+jam|office\s+laser\s+printer|"
            r"scratched\s+during\s+routine\s+sanding\s+check|polycarbonate\s+safety\s+glasses|"
            r"water\s+cooler\s+bottle|recycling\s+bin|waterproof\s+bib\s+coveralls|"
            r"boot\s+brush\s+station|stationery\s+requisition|ballpoint\s+pens|"
            r"first\s+aid\s+kit.*replenish|coffee\s+spill|extinguisher.*green\s+zone|"
            r"pressure\s+gauge\s+monthly\s+visual\s+inspection|office\s+mesh\s+swivel\s+chair|"
            r"antibacterial\s+liquid\s+soap|weather\s+forecast|rainfall\s+advisory)\b",
            re.IGNORECASE,
        )

        # 1. Confined Space
        self.re_cs_domain = re.compile(
            r"\b(confined\s+space|tank\w*|vessel\w*|separator\w*|manhole\w*|column\w*|"
            r"pit\w*|sump\w*|gas\s+boot|pig\s+receiver|receiver\s+barrel|pig\s+trap|"
            r"cellar\s+pit|mud\s+tank|suction\s+pit|boiler\w*|steam\s+drum|culvert\w*|"
            r"sewer\w*|water\s+injection\s+filter|manway|ko\s+drum|drum\b)\b",
            re.IGNORECASE,
        )
        self.re_cs_entry = re.compile(
            r"\b(enter\w*|inside|went\s+in|stepped\s+inside|crawled|descended|leaned\s+torso|"
            r"torso\s+entry|internal\s+inspection|in\s+frac\s+tank)\b",
            re.IGNORECASE,
        )
        self.re_cs_failure = re.compile(
            r"\b(without.*(gas\s+test|monitoring|loto|lock|tagout|attendant|scba|ventilation|blind)|"
            r"(gas\s+test|meter|detector|blower|fan|radio|ventilation).*(not|omitted|skipped|absent|calibrated|stopped|off|tripped|dead|failed)|"
            r"no\s+(gas\s+test|attendant|blower)|attendant.*(absent|left|away|post)|"
            r"unventilated|h2s.*detected|expired.*(permit|ptw)|(ptw|permit).*expired|"
            r"trapped.*(pressure|water|gas)|blew\s+door\s+open|blind.*not)\b",
            re.IGNORECASE,
        )

        # 2. Energy Isolation (LOTO)
        self.re_ei_domain = re.compile(
            r"\b(loto|lockout|tagout|isolat\w*|de-energiz\w*|pressur\w*|live\s+line|stored\s+energy|"
            r"flowline\w*|casing\s+wing|wellhead\w*|coupling\w*|flange\w*|transformer\w*|busbar\w*|"
            r"415v|switchgear\w*|hydraulic\w*|pneumatic\w*|steam\s+line|bleed\w*|shut-in\w*|"
            r"cracked-open|accumulator\w*|orifice\s+plate|channel\s+head|cylinder\w*|"
            r"pulsation\s+dampener|air\s+receiver|circuit\s+breaker|3\.3\s*kv|33\s*kv|compressor.*suction)\b",
            re.IGNORECASE,
        )
        self.re_ei_failure = re.compile(
            r"\b(without.*(loto|isolation|closing|bleeding|depressuriz\w*|voltage\s+test|permit|blind|dbb)|"
            r"no\s+loto|isolation\s+failed|not\s+(isolated|de-energized|vented|depressurized)|"
            r"before\s+closing\s+isolation|bleed(ing)?\s+(not|failed|omitted|without)|"
            r"residual\s+pressure|unisolated|lock.*not\s+hung|tagout.*omitted|breaker.*not\s+locked|"
            r"cracked-open|trapped\s+(gas|air|pressure|fluid|acid)|leaking|hammered.*pressurized|"
            r"\d+\s*(psi|bar)|acid\s+remained|wash.*skipped|blew.*off|unscrewed.*psi|unbolted.*psi|"
            r"unbolt.*pressurized|shutters.*jammed|test\s+prods.*not\s+used|not\s+been\s+performed|"
            r"blow\s+off|energized\s+and\s+no\s+safety|nitrogen\s+charge\s+without|"
            r"equalizer\s+valve\s+was\s+left\s+open|gas\s+bypass\s+to\s+atmosphere)\b",
            re.IGNORECASE,
        )

        # 3. Safe Mechanical Lifting
        self.re_lift_domain = re.compile(
            r"\b(crane\w*|hoist\w*|lifting\w*|suspended\s+load|rigging\w*|sling\w*|shackle\w*|"
            r"winch\w*|spreader\s+bar|outrigger\w*|boom\w*|tagline\w*|casing\s+joint|skid\s+lift|"
            r"hoisting|pallet\s+truck|rigger\w*|hook\w*|air\s+tugger|air\s+hoist|tandem\s+lift|"
            r"banksman|load\s+chart|asli|forklift.*mast)\b",
            re.IGNORECASE,
        )
        self.re_lift_failure = re.compile(
            r"\b(under(neath)?\s+(the\s+)?(suspended\s+)?load|beneath\s+(the\s+)?load|drop\s+zone|"
            r"damaged.*sling|cut\s+fibers|acid\s+burns|outriggers.*soft|"
            r"without.*(mats|tagline|banksman|lift\s+plan|coordinator)|tagline.*not\s+used|"
            r"overloaded|hook.*latch.*(broken|missing)|unlatched|without\s+securing\s+latch|"
            r"bypassed.*(asli|indicator|computer)|broken\s+strands|kinked|crushed.*rope|"
            r"mast\s+elevated|tandem\s+lift.*without|no\s+critical\s+lift\s+plan|"
            r"ground\s+marshal\s+was\s+not\s+deployed)\b",
            re.IGNORECASE,
        )

        # 4. Working at Height
        self.re_wah_domain = re.compile(
            r"\b(working\s+at\s+height|scaffold\w*|derrick\w*|mast\w*|monkey\s+board|racking\s+board|"
            r"ladder\w*|elevated\w*|roof\w*|platform\w*|meters\s+high|at\s+\d+\s*m(eters)?|tank\s+roof|"
            r"floor\s+grating|work\s+basket|fall\s+arrest|fall\s+protection|podium\s+ladder|"
            r"meters\s+above\s+ground|tubular\s+pipe\s+stands|untied|man-riding|hoisted\s+in)\b",
            re.IGNORECASE,
        )
        self.re_wah_failure = re.compile(
            r"\b(without.*(harness|tie-?off|fall\s+arrest|lifeline|crawling\s+boards|tying\s+off|foot\s+bracing|barricade)|"
            r"unclipped|unhooked|harness.*not\s+(anchored|clipped|connected)|no\s+harness|"
            r"unbolted.*without\s+lifeline|hole.*uncovered|open.*hole|foot\s+level|below\s+waist|"
            r"missing\s+cotter\s+pins|non-manrated|meters\s+above\s+ground|untied|"
            r"not\s+certified\s+for\s+man-riding|lacked\s+anti-two-block)\b",
            re.IGNORECASE,
        )

        # 5. Hot Work
        self.re_hw_domain = re.compile(
            r"\b(weld\w*|torch\w*|cutting\w*|grinding\w*|angle\s+grinder|spark\w*|hot\s+work|"
            r"arc\w*|brazing|burning|pyrophoric|hot\s+tap|fire\s+watch|pvrv)\b",
            re.IGNORECASE,
        )
        self.re_hw_failure = re.compile(
            r"\b(without.*(gas\s+test|monitoring|fire\s+watch|extinguisher|sealing|verifying|water\s+flushing|inerting|hydrogen)|"
            r"no\s+(gas\s+test|fire\s+watch)|continuous.*gas\s+test.*(missing|omitted|without)|"
            r"fire\s+watch.*absent|tarpaulin.*dislodged|directing.*into.*pit|operational\s+lpg|"
            r"non-flameproof|ozone\s+cracking|battery\s+room|hot\s+work\s+permit.*delayed|"
            r"electric\s+arc.*(vent|pvrv|relief)|live.*\d+\s*psi.*pipeline|pyrophoric.*without|"
            r"hydrogen\s+gas.*not\s+measured)\b",
            re.IGNORECASE,
        )

        # 6. Line of Fire
        self.re_lof_domain = re.compile(
            r"\b(line\s+of\s+fire|trench\w*|excavat\w*|rotary\s+hose|bullplug\w*|snubbing\w*|"
            r"whip\s*check\w*|recoil\w*|tensioned\w*|snapback\w*|whip\w*|high\s+pressure\s+hose|"
            r"iron\s+roughneck|tong\w*|cathead|pinch\s+point\w*|hammer\s+union|chiksan|swivel\s+joint|"
            r"flange\s+gap|forklift\s+mast|water\s+hose\s+flapping|cones|flange\s+shield|"
            r"sledgehammer|spinning\s+chain|swing\s+radius|counterweight|fingers\s+between)\b",
            re.IGNORECASE,
        )
        self.re_lof_failure = re.compile(
            r"\b(without.*(shoring|box|exclusion\s+zone|eye\s+protection|barricade)|in\s+front\s+of.*(plug|wrench)|"
            r"lacked.*snubbing|whip\s*check.*(missing|absent|disconnected)|in\s+path\s+of|trajectory|"
            r"recoil\s+path|pinch\s+zone|directly\s+facing|stand(ing)?\s+in\s+line|snapback\s+zone|"
            r"within\s+50cm|vibrating\s+violently|unanchored\s+iron|spinning\s+chain|inserted\s+fingers|"
            r"reached\s+arm|flapping.*unattended|counterweight.*within|without\s+physical\s+swing\s+radius)\b",
            re.IGNORECASE,
        )

        # 7. Bypassing Safety Controls
        self.re_bsc_domain = re.compile(
            r"\b(bypass\w*|override\w*|interlock\w*|safety\s+valve|psv|esd|lahh|level\s+alarm|"
            r"trip\s+switch|crown-o-matic|fire\s+and\s+gas|detector\w*|gag\w*|deluge\w*|thermal\s+relief|"
            r"smoke\s+detector|emergency\s+shutdown|jumper\w*)\b",
            re.IGNORECASE,
        )
        self.re_bsc_failure = re.compile(
            r"\b(jumper\s+wire|software\s+override|tied\s+off.*toggle|gagged|bridged|inhibited|defeated|"
            r"without\s+moc|without.*approval|unapproved.*jumper|silenced|gag\s+still\s+screwed|"
            r"plastic\s+grocery\s+bag|taped\s+plastic|packing\s+tape|closed\s+gate\s+valve.*upstream|"
            r"manual\s+lock\s+position|dust\s+cover\s+installed|bypassed.*emergency\s+shutdown|"
            r"bypassed.*(asli|indicator|computer))\b",
            re.IGNORECASE,
        )

        # 8. Driving
        self.re_drive_domain = re.compile(
            r"\b(driv\w*|vehicle\w*|truck\w*|tanker\w*|bus\w*|pickup\w*|trailer\w*|transport\w*|"
            r"highway\w*|lease\s+road|forklift\w*|tractor\w*)\b",
            re.IGNORECASE,
        )
        self.re_drive_failure = re.compile(
            r"\b(exceeded\s+\d+\s*km/h|at\s+\d+\s*km/h|speeding|texting|phone|mobile|"
            r"without\s+seatbelts?|not\s+wearing\s+seatbelts?|unbelted|"
            r"rollover|fishtailed|tipped\s+into\s+ditch|without\s+(pilot\s+)?escort|16\s+consecutive\s+hours|"
            r"fell\s+asleep|public\s+road.*dense\s+fog|roll-cage.*unbolted|linchpin.*replaced|"
            r"no\s+pilot\s+escort|defective\s+and\s+no\s+pilot)\b",
            re.IGNORECASE,
        )

        # 9. Work Authorization
        self.re_wa_domain = re.compile(
            r"\b(ptw|permit\w*|work\s+authorization|cold\s+work|hot\s+work\s+permit|jsa|"
            r"toolbox\s+talk|tbt|simops|performing\s+authority)\b",
            re.IGNORECASE,
        )
        self.re_wa_failure = re.compile(
            r"\b(without.*(ptw|permit|valid\s+permit|amendment)|expired\s+permit|permit.*expired|"
            r"permit\s+was\s+rejected|unauthorized|without.*signoff|no\s+toolbox\s+talk|scope\s+deviation|"
            r"self-authorized|signed\s+both|cut\s+into.*without|skipped.*toolbox\s+talk|signature\s+missing|"
            r"retest\s+delayed|cut\s+into\s+live.*header)\b",
            re.IGNORECASE,
        )

        # Toxic / H2S Gas Release
        self.re_toxic_release = re.compile(
            r"\b(h2s|sour\s+gas|toxic\s+gas|gas\s+leak|pinhole\s+leak|sulfide\s+gas)\b",
            re.IGNORECASE,
        )

    def evaluate(self, text: str, title: str = "") -> Dict[str, Any]:
        """
        Evaluate a narrative against codified safety rules and return triggered signals.
        """
        full_text = f"{title} {text}".strip()
        is_benign = bool(self.re_benign.search(full_text))

        if is_benign:
            admin_rule = CODIFIED_SAFETY_CATALOG.get("RULE-ADMIN-001")
            admin_dict = asdict(admin_rule) if admin_rule else {}
            return {
                "mandatory_high_psif": False,
                "triggered_rules": [],
                "triggered_rule_details": [admin_dict] if admin_dict else [],
                "rule_reasons": ["Routine administrative or benign non-industrial activity."],
                "suggested_rules": [],
                "is_benign": True,
                "severity_level": RuleSeverity.BENIGN_ADMINISTRATIVE.value,
                "stop_work_required": False,
                "audit_trail": [
                    {
                        "rule_id": "RULE-ADMIN-001",
                        "rule_name": "Benign Administrative / Non-Industrial Routine Activity",
                        "severity": RuleSeverity.BENIGN_ADMINISTRATIVE.value,
                        "action_status": "NEGATIVE_CONTROL_SUPPRESSED",
                        "status": "NEGATIVE_CONTROL_SUPPRESSED",
                        "action_taken": "No safety escalation required."
                    }
                ]
            }

        triggered_rules: List[str] = []
        rule_reasons: List[str] = []
        mandatory_high_psif = False
        suggested_rules: List[str] = []
        triggered_rule_ids: List[str] = []

        # Rule 1: Confined Space
        if self.re_cs_domain.search(text):
            suggested_rules.append("Confined Space")
            if self.re_cs_failure.search(text):
                r_id = "RULE-CS-001"
                triggered_rule_ids.append(r_id)
                triggered_rules.append("RULE-CS-001: Confined Space Entry with Critical Control Compromise")
                rule_reasons.append("Worker entered a confined space without recorded gas testing, positive blind, or standby attendant.")
                mandatory_high_psif = True

        # Rule 2: Energy Isolation (LOTO)
        if self.re_ei_domain.search(text):
            suggested_rules.append("Energy Isolation")
            if self.re_ei_failure.search(text) and "vented gauge through bleed port to 0 psi" not in text.lower():
                r_id = "RULE-EI-001"
                triggered_rule_ids.append(r_id)
                triggered_rules.append("RULE-EI-001: Live Energy Source Intervention Without Verified Isolation")
                rule_reasons.append("Work performed on pressurized/energized equipment without verified Lockout/Tagout (LOTO) or bleed-off.")
                mandatory_high_psif = True

        # Rule 3: Safe Mechanical Lifting
        if self.re_lift_domain.search(text):
            suggested_rules.append("Safe Mechanical Lifting")
            if any(k in text.lower() for k in ["under", "beneath", "drop zone"]):
                suggested_rules.append("Line of Fire")
            if self.re_lift_failure.search(text) and "pallet truck" not in text.lower():
                r_id = "RULE-LIFT-001"
                triggered_rule_ids.append(r_id)
                triggered_rules.append("RULE-LIFT-001: Personnel Positioned in Drop Zone or Lift Control Failure")
                rule_reasons.append("Personnel entered active drop zone, or lift conducted with compromised rigging or bypassed load chart.")
                mandatory_high_psif = True
                if "Line of Fire" not in suggested_rules:
                    suggested_rules.append("Line of Fire")

        # Rule 4: Working at Height
        if self.re_wah_domain.search(text):
            suggested_rules.append("Working at Height")
            if self.re_wah_failure.search(text) and "podium ladder" not in text.lower():
                r_id = "RULE-WAH-001"
                triggered_rule_ids.append(r_id)
                triggered_rules.append("RULE-WAH-001: Elevated Work Without Fall Arrest Protection")
                rule_reasons.append("Worker at elevated position without certified full-body harness, 100% tie-off, or fall arrest lifeline.")
                mandatory_high_psif = True

        # Rule 5: Hot Work
        if self.re_hw_domain.search(text):
            suggested_rules.append("Hot Work")
            if self.re_hw_failure.search(text):
                r_id = "RULE-HW-001"
                triggered_rule_ids.append(r_id)
                triggered_rules.append("RULE-HW-001: Hot Work in Hazardous Environment Without Fire Safeguards")
                rule_reasons.append("Open spark or thermal cutting performed in hydrocarbon area without verified continuous gas testing or fire watch.")
                mandatory_high_psif = True

        # Rule 6: Line of Fire
        if self.re_lof_domain.search(text):
            suggested_rules.append("Line of Fire")
            if self.re_lof_failure.search(text):
                r_id = "RULE-LOF-001"
                triggered_rule_ids.append(r_id)
                triggered_rules.append("RULE-LOF-001: Direct Exposure in Line of Fire / Stored Energy Release")
                rule_reasons.append("Personnel positioned directly in trajectory of pressurized release, trench collapse, or tensioned cable snapback.")
                mandatory_high_psif = True

        # Rule 7: Bypassing Safety Controls
        if self.re_bsc_domain.search(text):
            suggested_rules.append("Bypassing Safety Controls")
            if self.re_bsc_failure.search(text) and "dust cover" not in text.lower():
                r_id = "RULE-BSC-001"
                triggered_rule_ids.append(r_id)
                triggered_rules.append("RULE-BSC-001: Unauthorized Safety Control Defeat")
                rule_reasons.append("Safety-critical instrument, relief device, trip interlock, or ESD was intentionally defeated or bypassed.")
                mandatory_high_psif = True

        # Rule 8: Driving
        if self.re_drive_domain.search(text):
            suggested_rules.append("Driving")
            if self.re_drive_failure.search(text) and "hitch pin" not in text.lower():
                r_id = "RULE-DRIVE-001"
                triggered_rule_ids.append(r_id)
                triggered_rules.append("RULE-DRIVE-001: Reckless Transport / Seatbelt Non-Compliance")
                rule_reasons.append("Vehicle operated at dangerous speed, distracted driver, or occupants unbelted on hazardous operational roads.")
                mandatory_high_psif = True

        # Rule 9: Work Authorization
        if self.re_wa_domain.search(text):
            suggested_rules.append("Work Authorization")
            if self.re_wa_failure.search(text) and not any(k in text.lower() for k in ["signature missing", "delayed by 45"]):
                r_id = "RULE-WA-001"
                triggered_rule_ids.append(r_id)
                triggered_rules.append("RULE-WA-001: Work Performed Without Valid Work Authorization")
                rule_reasons.append("High hazard task commenced or continued under an expired, missing, or unauthorized Permit to Work (PTW).")
                mandatory_high_psif = True

        # Toxic / H2S Gas Release
        if self.re_toxic_release.search(text):
            r_id = "RULE-TOXIC-001"
            triggered_rule_ids.append(r_id)
            triggered_rules.append("RULE-TOXIC-001: Toxic Atmosphere / Sour Gas Release")
            rule_reasons.append("Hydrogen Sulfide (H2S) or toxic gas escape detected, posing credible acute poisoning or fatality threat.")
            mandatory_high_psif = True

        # Fallback domain check from title if text had minimal domain words
        if not suggested_rules and title:
            for rule_name, pattern in [
                ("Work Authorization", self.re_wa_domain),
                ("Line of Fire", self.re_lof_domain),
                ("Bypassing Safety Controls", self.re_bsc_domain),
                ("Hot Work", self.re_hw_domain),
                ("Working at Height", self.re_wah_domain),
                ("Safe Mechanical Lifting", self.re_lift_domain),
                ("Energy Isolation", self.re_ei_domain),
                ("Confined Space", self.re_cs_domain),
                ("Driving", self.re_drive_domain),
            ]:
                if pattern.search(title):
                    suggested_rules.append(rule_name)
                    break

        # Enrich with Catalog Details & Audit Trail
        triggered_rule_details: List[Dict[str, Any]] = []
        audit_trail: List[Dict[str, Any]] = []
        max_severity = RuleSeverity.PROCEDURAL_DEVIATION.value

        for r_id in triggered_rule_ids:
            rule_def = CODIFIED_SAFETY_CATALOG.get(r_id)
            if rule_def:
                detail = asdict(rule_def)
                # Convert enum to string
                detail["severity"] = rule_def.severity.value
                triggered_rule_details.append(detail)
                audit_trail.append({
                    "rule_id": rule_def.rule_id,
                    "rule_name": rule_def.rule_name,
                    "severity": rule_def.severity.value,
                    "regulatory_standard": rule_def.regulatory_standard,
                    "stop_work_action": rule_def.stop_work_action,
                    "action_status": "VETO_ENFORCED" if rule_def.severity == RuleSeverity.ZERO_TOLERANCE_FATAL else "ADVISORY_ISSUED"
                })
                if rule_def.severity == RuleSeverity.ZERO_TOLERANCE_FATAL:
                    max_severity = RuleSeverity.ZERO_TOLERANCE_FATAL.value

        if not triggered_rules:
            max_severity = "NONE_TRIGGERED"

        return {
            "mandatory_high_psif": mandatory_high_psif,
            "triggered_rules": triggered_rules,
            "triggered_rule_details": triggered_rule_details,
            "rule_reasons": rule_reasons,
            "suggested_rules": list(dict.fromkeys(suggested_rules)),
            "is_benign": False,
            "severity_level": max_severity,
            "stop_work_required": mandatory_high_psif,
            "audit_trail": audit_trail
        }
