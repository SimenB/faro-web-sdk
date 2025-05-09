import { BaseInstrumentation, VERSION } from '@grafana/faro-core';

import { WebVitalsBasic } from './webVitalsBasic';
import { WebVitalsWithAttribution } from './webVitalsWithAttribution';

export class WebVitalsInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-web-vitals';
  readonly version = VERSION;

  initialize(): void {
    this.logDebug('Initializing');
    const webVitals = this.intializeWebVitalsInstrumentation();
    webVitals.initialize();
  }

  private intializeWebVitalsInstrumentation() {
    if (
      this.config?.trackWebVitalsAttribution === false ||
      this.config?.webVitalsInstrumentation?.trackAttribution === false
    ) {
      return new WebVitalsBasic(this.api.pushMeasurement, this.config.webVitalsInstrumentation);
    }
    return new WebVitalsWithAttribution(this.api.pushMeasurement, this.config.webVitalsInstrumentation);
  }
}
