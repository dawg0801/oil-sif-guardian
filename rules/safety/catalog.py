"""
OIL-SIF Guardian — Codified Industrial Safety Rule Catalog
Formalized process safety rulebook codified against OISD, DGMS, PNGRB,
and IOGP Life-Saving Rules standards for Oil India Limited (OIL) operations.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List


class RuleSeverity(str, Enum):
    ZERO_TOLERANCE_FATAL = "ZERO_TOLERANCE_FATAL"
    CRITICAL_CONTROL_COMPROMISED = "CRITICAL_CONTROL_COMPROMISED"
    PROCEDURAL_DEVIATION = "PROCEDURAL_DEVIATION"
    BENIGN_ADMINISTRATIVE = "BENIGN_ADMINISTRATIVE"


@dataclass
class CodifiedRuleDefinition:
    rule_id: str
    rule_name: str
    iogp_category: str
    severity: RuleSeverity
    description: str
    failure_mechanism: str
    regulatory_standard: str
    stop_work_action: str
    prescribed_safeguards: List[str] = field(default_factory=list)


CODIFIED_SAFETY_CATALOG: Dict[str, CodifiedRuleDefinition] = {
    # -------------------------------------------------------------
    # 1. Confined Space Entry Rules (RULE-CS-*)
    # -------------------------------------------------------------
    "RULE-CS-001": CodifiedRuleDefinition(
        rule_id="RULE-CS-001",
        rule_name="Confined Space Entry with Critical Control Compromise",
        iogp_category="Confined Space",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Worker entered a confined space (separator, vessel, pit, tank) without verified atmospheric gas testing, positive isolation, or standby watcher.",
        failure_mechanism="Unventilated or toxic/flammable atmosphere entry causing acute asphyxiation or flash fire.",
        regulatory_standard="OISD-GDN-145 (Work Permit System) & OISD-STD-105 (Clause 5.4)",
        stop_work_action="Issue immediate Stop-Work Order. Evacuate confined space. Prohibit re-entry until multi-gas testing confirms O2 > 19.5% and LEL = 0%.",
        prescribed_safeguards=["Continuous forced air ventilation", "Calibrated 4-gas detector", "Dedicated trained standby attendant", "Confined Space Entry Permit"]
    ),
    "RULE-CS-002": CodifiedRuleDefinition(
        rule_id="RULE-CS-002",
        rule_name="Standby Attendant Omission During Confined Space Entry",
        iogp_category="Confined Space",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Confined space entry conducted while standby hole watcher / attendant was absent, unassigned, or left post.",
        failure_mechanism="Failure of emergency extraction line and loss of continuous communications during atmospheric upset.",
        regulatory_standard="OISD-STD-105 & DGMS (Tech) Circular 04 of 2018",
        stop_work_action="Halt inside work immediately until dedicated standby attendant is stationed at the manway with operational retrieval harness.",
        prescribed_safeguards=["Dedicated hole watcher", "Retrieval tripod and winch", "Two-way radio communication"]
    ),
    "RULE-CS-003": CodifiedRuleDefinition(
        rule_id="RULE-CS-003",
        rule_name="Unventilated Hydrocarbon Vessel Entry",
        iogp_category="Confined Space",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Entry into crude oil tank, test separator, or pig receiver without mechanical air eductor or forced draft blower.",
        failure_mechanism="Heavier-than-air hydrocarbon vapor pooling causing worker collapse.",
        regulatory_standard="OISD-STD-105 Clause 6.1 & PNGRB Technical Regulations",
        stop_work_action="Cease all entry activities. Deploy explosion-proof forced-air eductor blower for a minimum of 2 air changes before re-test.",
        prescribed_safeguards=["Explosion-proof eductor air blower", "Pre-entry and continuous gas monitoring"]
    ),
    "RULE-CS-004": CodifiedRuleDefinition(
        rule_id="RULE-CS-004",
        rule_name="Nitrogen Purged Vessel Entry Without SCBA",
        iogp_category="Confined Space",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Entering a vessel, column, or pipe header undergoing nitrogen (N2) blanketing/inerting without positive pressure SCBA and dual gas monitors.",
        failure_mechanism="Instantaneous anoxic blackout and fatality within 1-2 breaths in an oxygen-depleted environment.",
        regulatory_standard="OISD-STD-105 Clause 7.2 & API RP 2217A",
        stop_work_action="Immediate Stop-Work. Evacuate vessel perimeter. Barricade entry port with 'DANGER: INERT ATMOSPHERE' signage.",
        prescribed_safeguards=["Positive-pressure SCBA", "Continuous oxygen analyzer with audible alarm", "Inert space warning barrier"]
    ),

    # -------------------------------------------------------------
    # 2. Energy Isolation Rules (RULE-EI-*)
    # -------------------------------------------------------------
    "RULE-EI-001": CodifiedRuleDefinition(
        rule_id="RULE-EI-001",
        rule_name="Live Energy Source Intervention Without Verified Isolation",
        iogp_category="Energy Isolation",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Maintenance or intervention on pressurized, high-voltage, or chemical fluid equipment without verified Lockout/Tagout (LOTO) or bleed-down.",
        failure_mechanism="Sudden release of stored kinetic, electrical, or pneumatic energy directly striking personnel.",
        regulatory_standard="OISD-STD-137 & DGMS (OMR-2017) Regulation 88",
        stop_work_action="Immediate Stop-Work. Clear red-zone perimeter. Apply physical padlocks and danger tags. Verify zero energy state through bleed valves.",
        prescribed_safeguards=["Physical lockout padlocks", "Double Block and Bleed (DBB)", "Zero energy verification gauge check"]
    ),
    "RULE-EI-002": CodifiedRuleDefinition(
        rule_id="RULE-EI-002",
        rule_name="Pressurized Flange Unbolting Without Zero-Energy Verification",
        iogp_category="Energy Isolation",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Unbolting wellhead casing wing valve, pipeline manifold, or gas line flange under trapped operational pressure.",
        failure_mechanism="High-pressure gas or fluid ejection projecting heavy steel studs or blind flange as lethal shrapnel.",
        regulatory_standard="OISD-STD-118 & PNGRB Code of Practice for Natural Gas Pipelines",
        stop_work_action="Immediate Stop-Work. Evacuate 15-meter radius. Depressurize through dedicated vent header to 0.0 psi before wrenching.",
        prescribed_safeguards=["Flange spray shield", "Pressure transmitter cross-check", "Vent needle valve bleed-down"]
    ),
    "RULE-EI-003": CodifiedRuleDefinition(
        rule_id="RULE-EI-003",
        rule_name="High-Voltage Electrical Switchgear Intervention Without LOTO",
        iogp_category="Energy Isolation",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Intervention on 415V, 3.3kV, or 33kV switchgear cubicles, busbars, or transformers without physical breaker padlocking or discharge earth.",
        failure_mechanism="Arc flash explosion, thermal blast wave, and high-voltage electrocution.",
        regulatory_standard="Central Electricity Authority (CEA) Safety Reg 30 & OISD-STD-137",
        stop_work_action="Trip main circuit breaker. Rake out breaker trolley, apply lockable shutter padlocks, and ground busbars before approach.",
        prescribed_safeguards=["Test prods / voltage detector verification", "Busbar earth switch engagement", "Arc-flash rated PPE Level 4"]
    ),
    "RULE-EI-004": CodifiedRuleDefinition(
        rule_id="RULE-EI-004",
        rule_name="Pipeline Pig Receiver / Trap Opening Under Trapped Pressure",
        iogp_category="Energy Isolation",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Unlocking or opening quick-opening closure door of a pig receiver or launcher barrel before equalizing and venting barrel pressure to zero.",
        failure_mechanism="Explosive barrel door blowout propelling pig or closure door across facility.",
        regulatory_standard="OISD-STD-141 Clause 8.3 & ASME B31.8",
        stop_work_action="Halt door unclamping immediately. Close kicker valve, open barrel vent needle valve, and verify zero reading on both barrel gauges.",
        prescribed_safeguards=["Mechanical interlock between vent valve and door lock", "Dual pressure indicators", "Trained pigging technician signoff"]
    ),
    "RULE-EI-005": CodifiedRuleDefinition(
        rule_id="RULE-EI-005",
        rule_name="Spade / Spectacle Blind Reversal on Pressurized Manifold",
        iogp_category="Energy Isolation",
        severity=RuleSeverity.CRITICAL_CONTROL_COMPROMISED,
        description="Loosening pipe bolts to reverse or swing spectacle blind while upstream block valve integrity is unproven or leaking.",
        failure_mechanism="Sudden toxic/flammable fluid release bypassing seating surface during blind rotation.",
        regulatory_standard="OISD-STD-105 Clause 5.3 & API RP 520",
        stop_work_action="Re-torque bolts immediately. Verify block valve seal using body cavity bleeder before attempting blind reversal.",
        prescribed_safeguards=["Double block and bleed verification", "Flange spreader tool", "Catch basin and containment tray"]
    ),

    # -------------------------------------------------------------
    # 3. Safe Mechanical Lifting Rules (RULE-LIFT-*)
    # -------------------------------------------------------------
    "RULE-LIFT-001": CodifiedRuleDefinition(
        rule_id="RULE-LIFT-001",
        rule_name="Personnel Positioned in Suspended Load Drop Zone",
        iogp_category="Safe Mechanical Lifting",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Personnel walking, standing, or guiding directly underneath a suspended crane load, drill pipe bundle, or skid lift.",
        failure_mechanism="Catastrophic crushing fatality upon hoist brake slip, cable snap, or rigging hardware failure.",
        regulatory_standard="OISD-STD-114 & DGMS Technical Circular 02 of 2019",
        stop_work_action="Halt crane hoisting motion immediately. Evacuate personnel outside the 1.5x load radius exclusion zone.",
        prescribed_safeguards=["Fiber tagline for load orientation", "Hard barricading of drop perimeter", "Dedicated banksman whistle controls"]
    ),
    "RULE-LIFT-002": CodifiedRuleDefinition(
        rule_id="RULE-LIFT-002",
        rule_name="Compromised Rigging Slings or Defective Lifting Hardware",
        iogp_category="Safe Mechanical Lifting",
        severity=RuleSeverity.CRITICAL_CONTROL_COMPROMISED,
        description="Use of damaged wire rope slings (broken wires, kinking), acid-burned synthetic web slings, or shackles lacking safety pins.",
        failure_mechanism="Parting of sling under nominal load tension causing uncontrolled dropped object impact.",
        regulatory_standard="Factories Act 1948 Section 29 & OISD-STD-114",
        stop_work_action="Lower load to ground immediately. Cut and destroy damaged sling to prevent re-use. Issue tested certified replacement.",
        prescribed_safeguards=["Pre-use rigging inspection tag", "Current third-party test certificate (Form 10)", "Color-coded sling tagging"]
    ),
    "RULE-LIFT-003": CodifiedRuleDefinition(
        rule_id="RULE-LIFT-003",
        rule_name="Mobile Crane Outriggers Deployed on Unstable Ground",
        iogp_category="Safe Mechanical Lifting",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Operating mobile hydraulic crane with outriggers resting on soft mud, uncompacted soil, or without load-distributing hardwood mats.",
        failure_mechanism="Outrigger punch-through leading to crane toppling and mast collapse onto operational equipment.",
        regulatory_standard="OISD-STD-114 Clause 6.4 & API RP 2D",
        stop_work_action="Retract boom immediately. Reposition crane onto certified steel/hardwood spreader mats with verified ground bearing capacity.",
        prescribed_safeguards=["Heavy timber outrigger mats", "Ground compaction verification", "Bubble level verification before swing"]
    ),
    "RULE-LIFT-004": CodifiedRuleDefinition(
        rule_id="RULE-LIFT-004",
        rule_name="Tandem Crane Lift Executed Without Engineered Lift Plan",
        iogp_category="Safe Mechanical Lifting",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Dual crane lift executed without engineered rigging study, load distribution calculation, or dedicated lift director.",
        failure_mechanism="Dynamic load transfer between cranes causing single-crane overload and simultaneous boom failure.",
        regulatory_standard="OISD-STD-114 Clause 8.2 & ASME B30.5",
        stop_work_action="Suspend lifting operation. Lower vessel to skids. Require certified Lifting Specialist signoff on 3D lift engineering plan.",
        prescribed_safeguards=["Engineered critical lift plan", "Calibrated load cells on both cranes", "Single designated lift director radio channel"]
    ),
    "RULE-LIFT-005": CodifiedRuleDefinition(
        rule_id="RULE-LIFT-005",
        rule_name="Personnel Hoisting on Uncertified Crane Hook / Basket",
        iogp_category="Safe Mechanical Lifting",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Hoisting workers using a crane hook or non-manrated utility air hoist without certified personnel man-basket and anti-two-block device.",
        failure_mechanism="Worker fall from height or basket inversion upon mechanical failure.",
        regulatory_standard="DGMS (OMR-2017) Reg 76 & OISD-STD-114",
        stop_work_action="Immediate Stop-Work. Lower personnel to deck immediately. Prohibit crane riding without dedicated man-rated hoist system.",
        prescribed_safeguards=["Certified man-riding basket with roof shield", "Anti-two-block limit switch", "Secondary independent safety fall arrester"]
    ),

    # -------------------------------------------------------------
    # 4. Working at Height Rules (RULE-WAH-*)
    # -------------------------------------------------------------
    "RULE-WAH-001": CodifiedRuleDefinition(
        rule_id="RULE-WAH-001",
        rule_name="Elevated Work Without Fall Arrest Protection",
        iogp_category="Working at Height",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Worker performing activity at elevated location (> 1.8 meters) without full-body harness, double lanyard 100% tie-off, or life-line.",
        failure_mechanism="Uncontrolled fall from derrick, monkey board, racking board, or tank roof causing fatal impact.",
        regulatory_standard="OISD-STD-114 & DGMS (OMR-2017) Regulation 76",
        stop_work_action="Instruct worker to secure lanyard immediately to nearest certified anchor point. Discontinue work until compliant scaffolding/lifeline is rigged.",
        prescribed_safeguards=["Full-body safety harness with shock absorber", "Certified 22 kN anchor points", "Continuous retractable fall arrester"]
    ),
    "RULE-WAH-002": CodifiedRuleDefinition(
        rule_id="RULE-WAH-002",
        rule_name="Open Floor Grating / Unguarded Deck Opening",
        iogp_category="Working at Height",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Removal of steel deck grating, cellar pit cover, or trench plate leaving open floor hole without rigid top/mid-rails or hole cover.",
        failure_mechanism="Worker stepping into unlit opening falling through platform floors to ground or cellar pit.",
        regulatory_standard="Petroleum Rules 2002 & OISD-STD-114 Clause 5.3",
        stop_work_action="Immediately erect rigid perimeter guardrails (1.1m height with toe-boards) and securely bolt down labeled structural hole covers.",
        prescribed_safeguards=["Rigid scaffolding barrier with toe board", "Reflective warning tape & signage", "Secured steel cover plate with 'HOLE' marking"]
    ),
    "RULE-WAH-003": CodifiedRuleDefinition(
        rule_id="RULE-WAH-003",
        rule_name="Scaffold Erected Without Certified Green Scafftag",
        iogp_category="Working at Height",
        severity=RuleSeverity.CRITICAL_CONTROL_COMPROMISED,
        description="Personnel climbing or working from scaffolding bearing a Red tag, missing tag, or incomplete bracing and missing toe-boards.",
        failure_mechanism="Scaffold frame racking or toppling under live crew load.",
        regulatory_standard="OISD-STD-114 Clause 7.1 & IS 4014",
        stop_work_action="Halt work and tag scaffold RED. Prohibit access until scaffolding inspector certifies stability and affixes GREEN Scafftag.",
        prescribed_safeguards=["Weekly scaffolding inspection", "Certified scaffolding competence tag", "Complete handrail and toeboard assembly"]
    ),
    "RULE-WAH-004": CodifiedRuleDefinition(
        rule_id="RULE-WAH-004",
        rule_name="Heavy Tools Handled at Height Without Tool Lanyards",
        iogp_category="Working at Height",
        severity=RuleSeverity.PROCEDURAL_DEVIATION,
        description="Carrying heavy wrenches, hammer unions, or radio equipment on monkey board without wrist or belt tool-retention tethers.",
        failure_mechanism="Dropped object strike on personnel working on drill floor below.",
        regulatory_standard="OISD-STD-118 (Dropped Object Prevention) & DROPS Guidelines",
        stop_work_action="Require all elevated workers to attach certified tool lanyards to belts or structure before handling hand tools.",
        prescribed_safeguards=["Certified tool lanyards", "Debris netting on handrails", "Red-zone exclusion below elevated work"]
    ),

    # -------------------------------------------------------------
    # 5. Hot Work Rules (RULE-HW-*)
    # -------------------------------------------------------------
    "RULE-HW-001": CodifiedRuleDefinition(
        rule_id="RULE-HW-001",
        rule_name="Hot Work in Hazardous Zone Without Continuous Gas Monitoring",
        iogp_category="Hot Work",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Welding, grinding, torch cutting, or spark-producing operations conducted in hazardous operational area without calibrated continuous gas monitoring.",
        failure_mechanism="Ignition of fugitive hydrocarbon gas cloud resulting in vapor cloud explosion (VCE) or flash fire.",
        regulatory_standard="OISD-STD-105 Clause 7.1 & OISD-STD-137",
        stop_work_action="Shut off welding generator and gas torches immediately. Isolate spark source. Conduct 15-minute atmospheric re-survey.",
        prescribed_safeguards=["Continuous LEL gas monitor with visual strobe", "Fire blanket spark enclosure", "Dedicated pressurized fire water hose line"]
    ),
    "RULE-HW-002": CodifiedRuleDefinition(
        rule_id="RULE-HW-002",
        rule_name="Hot Work Conducted Without Dedicated Fire Watcher",
        iogp_category="Hot Work",
        severity=RuleSeverity.CRITICAL_CONTROL_COMPROMISED,
        description="Hot work actively executed while assigned fire watch personnel was absent, performing other tasks, or unequipped with portable fire extinguisher.",
        failure_mechanism="Delayed detection of flying slag or sparks igniting oily rags, pit scum, or adjacent cable insulation.",
        regulatory_standard="OISD-STD-105 Clause 7.4 & NFPA 51B",
        stop_work_action="Cease welding immediately. Assign trained fire watcher with operational 10kg DCP extinguisher and maintain 30-min post-work watch.",
        prescribed_safeguards=["Dedicated trained fire watch", "Dry chemical powder extinguisher on standby", "Mandatory 30-minute post-job fire watch"]
    ),
    "RULE-HW-003": CodifiedRuleDefinition(
        rule_id="RULE-HW-003",
        rule_name="Hot Tapping Performed Without Ultrasonic Thickness Survey",
        iogp_category="Hot Work",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Welding hot-tap fitting onto an active hydrocarbon pipeline without ultrasonic wall thickness survey verifying safe minimum thickness.",
        failure_mechanism="Burn-through into pressurized line causing instantaneous jet flame blowout.",
        regulatory_standard="API RP 2201 & OISD-STD-105 Clause 8.2",
        stop_work_action="Abort hot tap welding. Measure pipeline wall thickness across 360-degree perimeter. Verify thickness exceeds API 2201 threshold.",
        prescribed_safeguards=["Calibrated ultrasonic thickness measurement", "Pipeline flow rate control to dissipate heat", "Hot-tap engineering checklist"]
    ),
    "RULE-HW-004": CodifiedRuleDefinition(
        rule_id="RULE-HW-004",
        rule_name="Sparks / Non-Ex-Rated Tools in Battery / Hydrogen Rooms",
        iogp_category="Hot Work",
        severity=RuleSeverity.CRITICAL_CONTROL_COMPROMISED,
        description="Operating angle grinders or standard electrical drills inside UPS battery rooms with unventilated hydrogen accumulation.",
        failure_mechanism="Ignition of explosive hydrogen-air mixture causing building structural damage.",
        regulatory_standard="CEA Safety Reg 33 & OISD-STD-137",
        stop_work_action="Stop work. Ventilate battery room. Use only non-sparking beryllium-copper hand tools.",
        prescribed_safeguards=["Ex-rated certified electrical tools", "Forced mechanical exhaust ventilation", "Hydrogen concentration detector"]
    ),

    # -------------------------------------------------------------
    # 6. Line of Fire Rules (RULE-LOF-*)
    # -------------------------------------------------------------
    "RULE-LOF-001": CodifiedRuleDefinition(
        rule_id="RULE-LOF-001",
        rule_name="Direct Exposure in Line of Fire / Stored Energy Release",
        iogp_category="Line of Fire",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Personnel positioned directly in trajectory of pressurized flowline discharge, tensioned cable snapback, or swinging rotary equipment.",
        failure_mechanism="High-velocity projectile impact or severe blunt force trauma from mechanical/fluid recoil.",
        regulatory_standard="OISD-STD-118 & DGMS Technical Circular 03 of 2019",
        stop_work_action="Order worker out of danger line immediately. Relocate crew outside calculated snapback / discharge trajectory angles.",
        prescribed_safeguards=["Certified whip check cables on all high pressure hoses", "Safety shield deflector plates", "Marked red exclusion zone"]
    ),
    "RULE-LOF-002": CodifiedRuleDefinition(
        rule_id="RULE-LOF-002",
        rule_name="High-Pressure Hose Operated Without Whip-Check Cable",
        iogp_category="Line of Fire",
        severity=RuleSeverity.CRITICAL_CONTROL_COMPROMISED,
        description="High-pressure air, cement, or drilling fluid hose (> 1000 psi) operated with whip checks missing, disconnected, or damaged.",
        failure_mechanism="Hose coupling separation causing violent flailing and lethal whipping strikes.",
        regulatory_standard="OISD-STD-118 Clause 5.6 & API RP 54",
        stop_work_action="Shut down pump pressure immediately. Install and clamp certified steel whip check safety sling across both coupling sides.",
        prescribed_safeguards=["Steel whip-check safety cables", "Secondary safety clamping", "Quarterly pressure test certification"]
    ),
    "RULE-LOF-003": CodifiedRuleDefinition(
        rule_id="RULE-LOF-003",
        rule_name="Unshored Trench / Pipeline Excavation Entry",
        iogp_category="Line of Fire",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Entering pipeline trench or earthen pit deeper than 1.5 meters without engineered trench box, benching, or shoring.",
        failure_mechanism="Sudden sidewall cave-in and soil liquefaction causing suffocation and burial under heavy earth.",
        regulatory_standard="DGMS Regulation 115 & OISD-STD-105 Clause 9.1",
        stop_work_action="Order all personnel out of trench immediately. Install hydraulic trench shoring shields or step-cut soil at 45 degrees.",
        prescribed_safeguards=["Engineered trench box / shield", "Soil benching at 1:1 ratio", "Trench access ladder every 7.5 meters"]
    ),
    "RULE-LOF-004": CodifiedRuleDefinition(
        rule_id="RULE-LOF-004",
        rule_name="High-Pressure Hydrotesting Red Zone Entry",
        iogp_category="Line of Fire",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Personnel entering pressurized hydrotest perimeter while pipeline or vessel is under test pressure (> 3000 psi).",
        failure_mechanism="Catastrophic pipe burst or blind flange ejection releasing high-velocity water jet and steel fragments.",
        regulatory_standard="OISD-STD-141 Clause 7.2 & ASME B31.3",
        stop_work_action="Depressurize test manifold. Evacuate all personnel behind concrete blast barriers until test is completed.",
        prescribed_safeguards=["Barricaded 30-meter exclusion zone", "Remote pressure monitoring cameras", "Flange safety blast blankets"]
    ),
    "RULE-LOF-005": CodifiedRuleDefinition(
        rule_id="RULE-LOF-005",
        rule_name="Snubbing / Wellhead Line of Fire Exposure",
        iogp_category="Line of Fire",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Standing directly above or in line with pipe string or wireline lubricator under wellhead reservoir pressure.",
        failure_mechanism="Differential pressure ejection of tubular string or lubricator tool string.",
        regulatory_standard="DGMS (OMR-2017) Reg 82 & API RP 54",
        stop_work_action="Halt snubbing. Clear personnel from lubricator trajectory. Verify slip bowl interlock engage status.",
        prescribed_safeguards=["Hydraulic slip interlock", "Lubricator guy lines", "Work platform shielded operator console"]
    ),

    # -------------------------------------------------------------
    # 7. Bypassing Safety Controls Rules (RULE-BSC-*)
    # -------------------------------------------------------------
    "RULE-BSC-001": CodifiedRuleDefinition(
        rule_id="RULE-BSC-001",
        rule_name="Unauthorized Safety Control or ESD Defeat",
        iogp_category="Bypassing Safety Controls",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Safety-critical instrument, pressure safety valve (PSV), emergency shutdown valve (ESDV), trip interlock, or flame detector intentionally bypassed or disabled without MOC.",
        failure_mechanism="Loss of automated process containment leading to overpressure vessel rupture or unmitigated gas leak.",
        regulatory_standard="OISD-STD-152 (Risk Assessment) & OISD-STD-141",
        stop_work_action="Immediate Stop-Work. Re-instate physical and software trip interlocks. Conduct emergency MOC review before resuming operations.",
        prescribed_safeguards=["Formal Management of Change (MOC)", "Compensating manual watch protocols", "Operations Head written authorization"]
    ),
    "RULE-BSC-002": CodifiedRuleDefinition(
        rule_id="RULE-BSC-002",
        rule_name="Pressure Relief Valve (PSV) Isolation / Gagging",
        iogp_category="Bypassing Safety Controls",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Operating a pressurized separator, boiler, or pipeline with the upstream isolation block valve closed or relief valve test gag remaining in place.",
        failure_mechanism="Vessel explosion caused by hydraulic or thermal overpressure with no emergency relief path.",
        regulatory_standard="ASME Section VIII Div 1 & OISD-STD-132 Clause 4.2",
        stop_work_action="Immediately shut in vessel inlet. Depressurize through flare or manual vent. Lock upstream valve in full-open position with car-seal.",
        prescribed_safeguards=["Car-sealed open (CSO) block valves", "Mechanical interlocks on relief manifolds", "Removal of test gags before commissioning"]
    ),
    "RULE-BSC-003": CodifiedRuleDefinition(
        rule_id="RULE-BSC-003",
        rule_name="Optical Fire / Gas Detectors Masked with Tape or Plastic Bags",
        iogp_category="Bypassing Safety Controls",
        severity=RuleSeverity.CRITICAL_CONTROL_COMPROMISED,
        description="Covering optical flame detectors or catalytic bead gas sensors with plastic grocery bags or adhesive tape during routine painting/housekeeping without permit override log.",
        failure_mechanism="Total blindness of central DCS safety system to actual hydrocarbon fire or gas cloud accumulation.",
        regulatory_standard="OISD-STD-116 & OISD-STD-141",
        stop_work_action="Remove covers immediately. Inspect detector lenses. Perform functional gas check to confirm DCS telemetry.",
        prescribed_safeguards=["Central override bypass register", "Daily safety bypass audit", "Dedicated protective caps with audible override timers"]
    ),

    # -------------------------------------------------------------
    # 8. Driving Safety Rules (RULE-DRIVE-*)
    # -------------------------------------------------------------
    "RULE-DRIVE-001": CodifiedRuleDefinition(
        rule_id="RULE-DRIVE-001",
        rule_name="Reckless Heavy Transport / Seatbelt Non-Compliance",
        iogp_category="Driving",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Heavy crude tanker or crew transport operated at excessive speed on operational lease roads, unbelted driver, or fatigued vehicle operator.",
        failure_mechanism="Vehicle rollover, collision with wellhead piping, or driver ejection into roadway ditch.",
        regulatory_standard="Motor Vehicles Act (Amendment 2019) & OISD-GDN-166",
        stop_work_action="Suspend driver journey permit immediately. Verify 100% seatbelt usage. Conduct breathalyzer test and fatigue duty-hours check.",
        prescribed_safeguards=["In-Vehicle Monitoring System (IVMS)", "Seatbelt compliance checks", "Speed governors set to 40 km/h on lease roads"]
    ),
    "RULE-DRIVE-002": CodifiedRuleDefinition(
        rule_id="RULE-DRIVE-002",
        rule_name="Continuous Heavy Commercial Driving Exceeding Maximum Duty Limits",
        iogp_category="Driving",
        severity=RuleSeverity.CRITICAL_CONTROL_COMPROMISED,
        description="Operating crude oil bowsers or rig relocation trailers for > 12 continuous hours without mandated rest breaks.",
        failure_mechanism="Microsleep and loss of vehicle situational control resulting in highway collisions or tanker rollover.",
        regulatory_standard="OISD-GDN-166 Clause 4.3 & Motor Transport Workers Act",
        stop_work_action="Stand down driver immediately. Require mandatory 8-hour unbroken rest before releasing vehicle journey permit.",
        prescribed_safeguards=["Digital tachograph logs", "Mandatory rest stops every 4 hours", "Dual relief driver assignments on long hauls"]
    ),

    # -------------------------------------------------------------
    # 9. Work Authorization Rules (RULE-WA-*)
    # -------------------------------------------------------------
    "RULE-WA-001": CodifiedRuleDefinition(
        rule_id="RULE-WA-001",
        rule_name="Work Performed Without Valid Work Authorization",
        iogp_category="Work Authorization",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Hazardous task (cold work, hot work, vessel entry, lifting) commenced or continued under an expired, missing, or unauthorized Permit to Work (PTW).",
        failure_mechanism="Execution of complex industrial task without formal risk assessment, boundary isolation, or multi-department SIMOPS coordination.",
        regulatory_standard="OISD-GDN-145 (Work Permit System in Petroleum Industry)",
        stop_work_action="Issue immediate Stop-Work. Clear work area. Perform comprehensive Job Safety Analysis (JSA) and obtain signed approval from Asset Manager.",
        prescribed_safeguards=["Signed Permit to Work (PTW)", "Toolbox Talk (TBT) documentation", "Performing Authority cross-verification"]
    ),
    "RULE-WA-002": CodifiedRuleDefinition(
        rule_id="RULE-WA-002",
        rule_name="Work Scope Deviation Without Permit Re-Validation",
        iogp_category="Work Authorization",
        severity=RuleSeverity.CRITICAL_CONTROL_COMPROMISED,
        description="Commencing pipe cutting or welding on a live header when the authorized permit only approved cold visual inspection.",
        failure_mechanism="Encountering unanticipated process hazards not controlled under the original permit boundaries.",
        regulatory_standard="OISD-GDN-145 Clause 5.2",
        stop_work_action="Halt task. Return permit to Issuer. Conduct revised JSA and re-issue permit reflecting expanded scope.",
        prescribed_safeguards=["Mandatory scope re-validation", "Issuer field site inspection"]
    ),
    "RULE-WA-003": CodifiedRuleDefinition(
        rule_id="RULE-WA-003",
        rule_name="Simultaneous Operations (SIMOPS) Conducted Without Coordination Matrix",
        iogp_category="Work Authorization",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Executing wireline well-logging while coil tubing or hot work is underway on adjacent well slot without SIMOPS leader signoff.",
        failure_mechanism="Mutual interference between high-energy operations causing uncoordinated well shut-in or ignition.",
        regulatory_standard="OISD-STD-105 Clause 11.2 & API RP 54",
        stop_work_action="Shut down secondary operation immediately. Concurrence meeting between rig superintendent and production in-charge required.",
        prescribed_safeguards=["SIMOPS coordination matrix", "Daily cross-department morning coordination briefing", "Dedicated SIMOPS controller"]
    ),

    # -------------------------------------------------------------
    # 10. Toxic Atmosphere & Sour Gas Rules (RULE-TOXIC-*)
    # -------------------------------------------------------------
    "RULE-TOXIC-001": CodifiedRuleDefinition(
        rule_id="RULE-TOXIC-001",
        rule_name="Toxic Atmosphere / Sour Gas (H2S) Release",
        iogp_category="Energy Isolation",
        severity=RuleSeverity.ZERO_TOLERANCE_FATAL,
        description="Hydrogen Sulfide (H2S) or toxic gas escape detected (> 10 ppm) with personnel present without self-contained breathing apparatus (SCBA).",
        failure_mechanism="Rapid olfactory fatigue followed by acute respiratory paralysis and fatal unconsciousness within seconds.",
        regulatory_standard="OISD-STD-155 (Personnel Protection Against H2S) & DGMS Circular 05/2016",
        stop_work_action="Sound rig evacuation siren. Muster upwind/crosswind to designated assembly point. Deploy search and rescue teams only in positive-pressure SCBA.",
        prescribed_safeguards=["Continuous fixed optical H2S detectors", "Personal 4-gas monitors with vibrating alarm", "Positive-pressure SCBA escape sets", "Windsocks on all well pads"]
    ),

    # -------------------------------------------------------------
    # Negative Control Rule (RULE-ADMIN-001)
    # -------------------------------------------------------------
    "RULE-ADMIN-001": CodifiedRuleDefinition(
        rule_id="RULE-ADMIN-001",
        rule_name="Benign Administrative / Non-Industrial Routine Activity",
        iogp_category="None",
        severity=RuleSeverity.BENIGN_ADMINISTRATIVE,
        description="Routine office tasks, stationery replenishment, printer maintenance, or non-hazardous administrative activities.",
        failure_mechanism="Non-industrial event possessing zero fatal precursor or severe injury potential.",
        regulatory_standard="General HSE Administrative Guidelines",
        stop_work_action="No safety action required. File record in administrative documentation log.",
        prescribed_safeguards=["Standard workplace ergonomics", "Routine housekeeping"]
    )
}
