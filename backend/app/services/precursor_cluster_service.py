"""
OIL-SIF Guardian — Precursor Clustering & SIF Exposure Fingerprinting Service
Extracts standardized 5-tuple fingerprints [ACTIVITY]|[ENERGY]|[HAZARD]|[BARRIER_FAILURE]|[IOGP_RULE],
clusters historical precursors across OIL operating assets, and builds network graph topologies.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Set

from rules.barriers.barrier_taxonomy import BarrierCategory, BarrierState, barrier_analyzer
from rules.safety.deterministic_rules import DeterministicSafetyRuleEngine


@dataclass
class SIFExposureFingerprint:
    raw_fingerprint: str
    activity: str
    hazardous_energy: str
    hazard: str
    barrier_failure: str
    iogp_rule: str

    def to_dict(self) -> Dict[str, str]:
        return {
            "fingerprint": self.raw_fingerprint,
            "activity": self.activity,
            "hazardous_energy": self.hazardous_energy,
            "hazard": self.hazard,
            "barrier_failure": self.barrier_failure,
            "iogp_rule": self.iogp_rule
        }


class PrecursorClusterService:
    """
    Analyzes, clusters, and links SIF precursors across facilities and failure modes.
    """

    def __init__(self):
        self.rules_engine = DeterministicSafetyRuleEngine()

    def generate_fingerprint(
        self,
        narrative: str,
        activity: str = "Operations",
        site: str = "OIL Facility",
        title: str = ""
    ) -> SIFExposureFingerprint:
        """
        Derives canonical 5-tuple SIF Exposure Fingerprint from narrative and metadata.
        """
        combined = f"{title} {narrative}".lower()
        barriers = barrier_analyzer.analyze(narrative)
        rule_eval = self.rules_engine.evaluate(narrative, title=title)

        # 1. Activity
        act_clean = (activity or "OPERATIONS").strip().upper().replace(" ", "_")
        if any(k in combined for k in ["vessel", "tank", "entry", "enter", "entered", "separator", "column", "internal inspection"]):
            act_clean = "VESSEL_ENTRY"
        elif any(k in combined for k in ["wellhead", "christmas tree", "valve maintenance"]):
            act_clean = "WELLHEAD_INTERVENTION"
        elif any(k in combined for k in ["lifting", "crane", "hoisting", "tubular"]):
            act_clean = "TUBULAR_HOISTING"
        elif any(k in combined for k in ["welding", "grinding", "cutting", "torch"]):
            act_clean = "HOT_WORK_MAINTENANCE"
        elif any(k in combined for k in ["derrick", "mast", "scaffold", "monkey board"]):
            act_clean = "ELEVATED_RIG_SERVICE"
        elif any(k in combined for k in ["driving", "transport", "tanker", "lease road"]):
            act_clean = "ROAD_LOGISTICS"

        # 2. Hazardous Energy
        energy = "MECHANICAL"
        if any(k in combined for k in ["h2s", "toxic", "sour gas", "gas release", "hydrocarbon", "acid", "crude", "gas", "chemical", "flammable"]):
            energy = "CHEMICAL_TOXIC"
        elif any(k in combined for k in ["pressurized", "psi", "bar", "kick", "blowout", "hydraulic", "bleed"]):
            energy = "HIGH_PRESSURE"
        elif any(k in combined for k in ["suspended", "height", "dropped", "derrick", "scaffold", "crane"]):
            energy = "GRAVITY_SUSPENDED"
        elif any(k in combined for k in ["welding", "torch", "spark", "flame", "hot work"]):
            energy = "THERMAL_IGNITION"
        elif any(k in combined for k in ["voltage", "generator", "415v", "3.3 kv", "switchgear"]):
            energy = "ELECTRICAL"
        elif any(k in combined for k in ["speeding", "rollover", "collision", "vehicle"]):
            energy = "KINETIC_TRANSPORT"

        # 3. Hazard
        hazard = "OPERATIONAL_HAZARD"
        if "confined space" in combined or any(k in combined for k in ["tank", "vessel", "separator", "sump", "pit"]):
            hazard = "CONFINED_TOXIC_ATMOSPHERE"
        elif any(k in combined for k in ["wellhead", "gas line", "flowline", "manifold", "pressurized"]):
            hazard = "STORED_PRESSURE_RELEASE"
        elif any(k in combined for k in ["suspended load", "drop zone", "casing joint", "crane"]):
            hazard = "SUSPENDED_LOAD_TRAJECTORY"
        elif any(k in combined for k in ["derrick", "scaffold", "elevated", "monkey board", "height"]):
            hazard = "ELEVATED_FALL_HAZARD"
        elif any(k in combined for k in ["welding", "grinding", "cutting", "hot work"]):
            hazard = "HYDROCARBON_VAPOR_IGNITION"
        elif any(k in combined for k in ["trench", "recoil", "line of fire", "whip check", "snapback"]):
            hazard = "STORED_MECHANICAL_ENERGY"
        elif any(k in combined for k in ["speeding", "rollover", "fog", "unbelted"]):
            hazard = "VEHICLE_LOSS_OF_CONTROL"

        # 4. Barrier Failure
        barrier_failure = "NO_CRITICAL_FAILURE"
        failed_barriers = [b for b in barriers.detected_barriers if b.state in (BarrierState.FAILED, BarrierState.BYPASSED, BarrierState.ABSENT)]
        if failed_barriers:
            top_failure = failed_barriers[0]
            if top_failure.barrier_id == "HW-F&G-01":
                barrier_failure = "GAS_TESTING_OMITTED"
            elif top_failure.barrier_id == "AD-LOTO-01":
                barrier_failure = "LOTO_ISOLATION_FAILED"
            elif top_failure.barrier_id == "HA-POS-01":
                barrier_failure = "DROP_ZONE_BREACHED"
            elif top_failure.barrier_id == "HA-TIEOFF-01":
                barrier_failure = "100_PERCENT_TIE_OFF_OMITTED"
            elif top_failure.barrier_id == "HA-WATCH-01":
                barrier_failure = "STANDBY_WATCHER_ABSENT"
            elif top_failure.barrier_id == "AD-PTW-01":
                barrier_failure = "WORK_AUTHORIZATION_EXPIRED"
            elif top_failure.barrier_id == "HW-RELIEF-01" or top_failure.barrier_id == "HW-BOP-01":
                barrier_failure = "SAFETY_DEVICE_BYPASSED"
            elif top_failure.barrier_id == "HW-REST-01":
                barrier_failure = "WHIP_CHECK_ABSENT"
            else:
                barrier_failure = top_failure.sub_type.upper().replace(" ", "_")
        elif any(k in combined for k in ["without gas test", "no gas test"]):
            barrier_failure = "GAS_TESTING_OMITTED"
        elif any(k in combined for k in ["without loto", "no loto", "isolation"]):
            barrier_failure = "LOTO_ISOLATION_FAILED"
        elif any(k in combined for k in ["drop zone", "under load", "beneath"]):
            barrier_failure = "DROP_ZONE_BREACHED"
        elif any(k in combined for k in ["unclipped", "no harness", "tie-off"]):
            barrier_failure = "100_PERCENT_TIE_OFF_OMITTED"

        # 5. IOGP Life-Saving Rule
        primary_rule = "NONE"
        if rule_eval["suggested_rules"]:
            primary_rule = rule_eval["suggested_rules"][0]
        rule_clean = primary_rule.upper().replace(" ", "_")

        raw_fingerprint = f"{act_clean}|{energy}|{hazard}|{barrier_failure}|{rule_clean}"

        return SIFExposureFingerprint(
            raw_fingerprint=raw_fingerprint,
            activity=act_clean,
            hazardous_energy=energy,
            hazard=hazard,
            barrier_failure=barrier_failure,
            iogp_rule=primary_rule
        )

    def cluster_incidents(self, incidents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Groups incidents into recurring systemic precursor clusters.
        """
        if not incidents:
            return self._get_canonical_clusters()

        # Group by (IOGP Rule, Barrier Failure) or high-level failure archetype
        clusters_map: Dict[str, Dict[str, Any]] = {}

        for inc in incidents:
            text = inc.get("text") or inc.get("normalized_text") or inc.get("raw_text") or ""
            title = inc.get("title") or ""
            activity = inc.get("activity") or "Operations"
            site = inc.get("site") or "OIL Facility"
            report_id = inc.get("report_id") or inc.get("id") or "INC"
            priority = inc.get("priority") or inc.get("psif_priority") or "LOW"

            fp = self.generate_fingerprint(text, activity=activity, site=site, title=title)
            barriers = barrier_analyzer.analyze(text)

            cluster_key = f"{fp.iogp_rule}::{fp.barrier_failure}"

            if cluster_key not in clusters_map:
                cluster_id = f"CL-{fp.iogp_rule[:3].upper()}-{len(clusters_map) + 1:02d}"
                clusters_map[cluster_key] = {
                    "cluster_id": cluster_id,
                    "theme": self._format_theme(fp.iogp_rule, fp.barrier_failure, fp.hazard),
                    "primary_iogp_rule": fp.iogp_rule,
                    "exposure_fingerprint": fp.raw_fingerprint,
                    "common_failure": fp.barrier_failure.replace("_", " ").title(),
                    "hazard": fp.hazard.replace("_", " ").title(),
                    "reports_count": 0,
                    "high_psif_count": 0,
                    "affected_facilities": set(),
                    "barrier_breakdowns": {
                        "hardware_failed": 0,
                        "admin_failed": 0,
                        "human_failed": 0,
                    },
                    "sample_incidents": []
                }

            c = clusters_map[cluster_key]
            c["reports_count"] += 1
            if priority == "HIGH":
                c["high_psif_count"] += 1
            c["affected_facilities"].add(site)

            # Barrier counts
            c["barrier_breakdowns"]["hardware_failed"] += barriers.summary_by_category[BarrierCategory.HARDWARE.value]["failed"]
            c["barrier_breakdowns"]["admin_failed"] += barriers.summary_by_category[BarrierCategory.ADMINISTRATIVE.value]["failed"]
            c["barrier_breakdowns"]["human_failed"] += barriers.summary_by_category[BarrierCategory.HUMAN_ACTION.value]["failed"]

            if len(c["sample_incidents"]) < 4:
                c["sample_incidents"].append({
                    "id": report_id,
                    "title": title or text[:60] + "...",
                    "site": site,
                    "priority": priority
                })

        # Format into sorted list
        results = []
        for c in clusters_map.values():
            facilities_list = sorted(list(c["affected_facilities"]))
            recurrence_rate = round(c["reports_count"] * (1.5 if c["high_psif_count"] > 1 else 1.0), 1)
            results.append({
                "cluster_id": c["cluster_id"],
                "theme": c["theme"],
                "primary_iogp_rule": c["primary_iogp_rule"],
                "exposure_fingerprint": c["exposure_fingerprint"],
                "common_failure": c["common_failure"],
                "hazard": c["hazard"],
                "reports_count": c["reports_count"],
                "high_psif_count": c["high_psif_count"],
                "recurrence_score": recurrence_rate,
                "affected_facilities": facilities_list[:5],
                "facility_count": len(facilities_list),
                "barrier_breakdowns": c["barrier_breakdowns"],
                "sample_incidents": c["sample_incidents"]
            })

        # Sort by recurrence score descending
        results.sort(key=lambda x: (x["high_psif_count"], x["reports_count"]), reverse=True)
        return results

    def generate_cluster_graph(self, incidents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Builds a Node-Link network graph structure mapping clusters, facilities,
        barrier failures, and incidents for interactive network visualization.
        """
        clusters = self.cluster_incidents(incidents)

        nodes: List[Dict[str, Any]] = []
        links: List[Dict[str, Any]] = []
        node_ids: Set[str] = set()

        # 1. Add Cluster Center Nodes
        for c in clusters:
            cid = f"cluster_{c['cluster_id']}"
            if cid not in node_ids:
                node_ids.add(cid)
                nodes.append({
                    "id": cid,
                    "label": c["theme"],
                    "type": "CLUSTER",
                    "category": c["primary_iogp_rule"],
                    "val": 15 + c["reports_count"] * 2,
                    "priority": "HIGH" if c["high_psif_count"] > 0 else "REVIEW",
                    "fingerprint": c["exposure_fingerprint"]
                })

            # 2. Add Facility Nodes & Links
            for fac in c["affected_facilities"]:
                fid = f"facility_{fac.replace(' ', '_')}"
                if fid not in node_ids:
                    node_ids.add(fid)
                    nodes.append({
                        "id": fid,
                        "label": fac,
                        "type": "ASSET",
                        "category": "Facility",
                        "val": 10,
                        "priority": "NORMAL",
                        "fingerprint": ""
                    })

                links.append({
                    "source": fid,
                    "target": cid,
                    "relation": "OCCURRED_AT",
                    "weight": 1.5
                })

            # 3. Add Common Barrier Failure Nodes & Links
            fail_id = f"barrier_{c['common_failure'].replace(' ', '_')}"
            if fail_id not in node_ids:
                node_ids.add(fail_id)
                nodes.append({
                    "id": fail_id,
                    "label": c["common_failure"],
                    "type": "BARRIER",
                    "category": "Failure Mode",
                    "val": 12,
                    "priority": "HIGH",
                    "fingerprint": ""
                })

            links.append({
                "source": cid,
                "target": fail_id,
                "relation": "BREACHED_BARRIER",
                "weight": 2.0
            })

            # 4. Add Sample Incident Nodes & Links
            for inc in c.get("sample_incidents", []):
                inc_id = f"inc_{inc['id']}"
                if inc_id not in node_ids:
                    node_ids.add(inc_id)
                    nodes.append({
                        "id": inc_id,
                        "label": f"#{inc['id']}: {inc['title'][:32]}",
                        "type": "INCIDENT",
                        "category": inc.get("priority", "LOW"),
                        "val": 7,
                        "priority": inc.get("priority", "LOW"),
                        "fingerprint": ""
                    })

                links.append({
                    "source": inc_id,
                    "target": cid,
                    "relation": "BELONGS_TO_CLUSTER",
                    "weight": 1.0
                })

        return {
            "nodes": nodes,
            "links": links,
            "total_nodes": len(nodes),
            "total_links": len(links),
            "cluster_count": len(clusters)
        }

    def _format_theme(self, rule: str, failure: str, hazard: str) -> str:
        rule_titles = {
            "Confined Space": "Vessel & Separator Confined Space Entry",
            "Energy Isolation": "Unverified Energy Isolation & LOTO Defeat",
            "Safe Mechanical Lifting": "Drop Zone & Rig Hoisting Compromise",
            "Working at Height": "Elevated Rig Floor & Mast Fall Protection Deficit",
            "Hot Work": "Ignition Source Control in Hydrocarbon Atmosphere",
            "Line of Fire": "High Pressure Trajectory & Line of Fire Exposure",
            "Bypassing Safety Controls": "Critical Safety Interlock & Relief Override",
            "Driving": "Transport Fleet Speed & Lease Road Non-Compliance",
            "Work Authorization": "High-Hazard Task Commencement Without Authorized PTW"
        }
        base = rule_titles.get(rule, f"{rule} Operational Precursors")
        fail_clean = failure.replace("_", " ").title()
        return f"{base} ({fail_clean})"

    def _get_canonical_clusters(self) -> List[Dict[str, Any]]:
        """
        Fallback canonical precursor clusters for initial system seed state.
        """
        return [
            {
                "cluster_id": "CL-CS-01",
                "theme": "Vessel & Separator Confined Space Entry (Gas Testing Omitted)",
                "primary_iogp_rule": "Confined Space",
                "exposure_fingerprint": "VESSEL_ENTRY|CHEMICAL_TOXIC|CONFINED_TOXIC_ATMOSPHERE|GAS_TESTING_OMITTED|CONFINED_SPACE",
                "common_failure": "Gas Testing Omitted",
                "hazard": "Confined Space Toxic Atmosphere",
                "reports_count": 8,
                "high_psif_count": 8,
                "recurrence_score": 12.0,
                "affected_facilities": ["EPS-1", "OCS-1 Naharkatia", "CTF-Duliajan"],
                "facility_count": 3,
                "barrier_breakdowns": {"hardware_failed": 8, "admin_failed": 6, "human_failed": 8},
                "sample_incidents": [
                    {"id": "CS-001", "title": "Worker entered crude separator without gas test", "site": "EPS-1", "priority": "HIGH"},
                    {"id": "CS-004", "title": "Frac tank inspection without continuous monitoring", "site": "OCS-1 Naharkatia", "priority": "HIGH"}
                ]
            },
            {
                "cluster_id": "CL-EI-01",
                "theme": "Unverified Energy Isolation & LOTO Defeat (Loto Isolation Failed)",
                "primary_iogp_rule": "Energy Isolation",
                "exposure_fingerprint": "WELLHEAD_INTERVENTION|HIGH_PRESSURE|STORED_PRESSURE_RELEASE|LOTO_ISOLATION_FAILED|ENERGY_ISOLATION",
                "common_failure": "Loto Isolation Failed",
                "hazard": "High Pressure Hydrocarbon Line",
                "reports_count": 11,
                "high_psif_count": 10,
                "recurrence_score": 16.5,
                "affected_facilities": ["Drilling Rig OIL-45", "GCP-Duliajan", "Wellhead Cluster NHK-204"],
                "facility_count": 3,
                "barrier_breakdowns": {"hardware_failed": 4, "admin_failed": 11, "human_failed": 2},
                "sample_incidents": [
                    {"id": "EI-001", "title": "Unbolted flowline flange with 350 psi trapped", "site": "Drilling Rig OIL-45", "priority": "HIGH"},
                    {"id": "EI-003", "title": "Lockout tag omitted on suction header", "site": "GCP-Duliajan", "priority": "HIGH"}
                ]
            },
            {
                "cluster_id": "CL-LIFT-01",
                "theme": "Drop Zone & Rig Hoisting Compromise (Drop Zone Breached)",
                "primary_iogp_rule": "Safe Mechanical Lifting",
                "exposure_fingerprint": "TUBULAR_HOISTING|GRAVITY_SUSPENDED|SUSPENDED_LOAD_TRAJECTORY|DROP_ZONE_BREACHED|SAFE_MECHANICAL_LIFTING",
                "common_failure": "Drop Zone Breached",
                "hazard": "Suspended Tubular Drill String",
                "reports_count": 7,
                "high_psif_count": 7,
                "recurrence_score": 10.5,
                "affected_facilities": ["Drilling Rig OIL-78", "Workover Unit WOU-12"],
                "facility_count": 2,
                "barrier_breakdowns": {"hardware_failed": 2, "admin_failed": 1, "human_failed": 7},
                "sample_incidents": [
                    {"id": "LIFT-001", "title": "Roughneck walked under suspended 9.5-inch casing", "site": "Drilling Rig OIL-78", "priority": "HIGH"},
                    {"id": "LIFT-003", "title": "Tagline unguided during cross-wind hoisting", "site": "Workover Unit WOU-12", "priority": "HIGH"}
                ]
            }
        ]


precursor_cluster_service = PrecursorClusterService()
