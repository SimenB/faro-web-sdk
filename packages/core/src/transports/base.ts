import { BaseExtension } from '../extensions';

import type { Transport, TransportItem } from './types';

export abstract class BaseTransport extends BaseExtension implements Transport {
  abstract send(items: TransportItem | TransportItem[]): void | Promise<void>;

  protected markItemAsSent(item: TransportItem): void {
    const attributes = item.meta.session?.attributes;

    if (attributes && Boolean(attributes['isSampled'])) {
      const { isSampled: _, ...restAttributes } = attributes;

      item.meta.session = {
        ...item.meta.session,
        attributes: restAttributes,
      };
    }
  }

  isBatched(): boolean {
    return false;
  }

  getIgnoreUrls(): Array<string | RegExp> {
    return [];
  }
}
