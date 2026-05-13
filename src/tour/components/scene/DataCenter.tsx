"use client";

import { SiteShell } from "./modules/SiteShell";
import { PowerYard } from "./modules/PowerYard";
import { CoolingPlant } from "./modules/CoolingPlant";
import { ComputeHall } from "./modules/ComputeHall";
import { RackNVL72 } from "./modules/RackNVL72";
import { NetworkFabric } from "./modules/NetworkFabric";
import { StorageTier } from "./modules/StorageTier";
import { CoolantFlow } from "./flows/CoolantFlow";
import { PacketFlow } from "./flows/PacketFlow";
import { PowerPulse, PowerFeedAmbient } from "./flows/PowerPulse";
import { DataPathFlows } from "./flows/DataPathFlows";
import { CloudEdgeRelay } from "./flows/CloudEdgeRelay";
import { UtilityMeteringHub } from "./flows/UtilityMeteringHub";
import { CoreSiteHardware } from "./CoreSiteHardware";
import { LayerOverlays } from "./layers";

export function DataCenter() {
  return (
    <group>
      <SiteShell />
      <PowerYard />
      <CoolingPlant />
      <ComputeHall />
      <RackNVL72 position={[0, 0, -2]} />
      <NetworkFabric />
      <StorageTier />

      <CoreSiteHardware />

      <CloudEdgeRelay />
      <UtilityMeteringHub />

      <CoolantFlow />
      <PacketFlow id="nvlinkPackets" />
      <PacketFlow id="fabricPackets" />
      <PowerPulse />
      <PowerFeedAmbient />
      <DataPathFlows />

      <LayerOverlays />
    </group>
  );
}
