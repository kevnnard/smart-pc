import ChassisViewer from "../configurator/ChassisViewer";

/** Reuses the configurator's finished chassis scene as a display-only home hero. */
export default function HeroChassis() {
  return <ChassisViewer selection={{}} activeStep="summary" variant="hero" />;
}
