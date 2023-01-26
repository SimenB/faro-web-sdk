export { getWebInstrumentations, makeCoreConfig } from './config';
export type { BrowserConfig } from './config';

export { defaultEventDomain } from './consts';

export { initializeFaro } from './initialize';

export {
  buildStackFrame,
  ConsoleInstrumentation,
  ErrorsInstrumentation,
  getDataFromSafariExtensions,
  getStackFramesFromError,
  parseStacktrace,
  ViewInstrumentation,
  WebVitalsInstrumentation,
} from './instrumentations';
export type { ConsoleInstrumentationOptions, ErrorEvent, ExtendedPromiseRejectionEvent } from './instrumentations';

export { browserMeta, createSession, defaultMetas, defaultViewMeta, pageMeta } from './metas';

export { ConsoleTransport, FetchTransport } from './transports';
export type {
  ClockFn,
  ConsoleTransportOptions,
  FetchTransportOptions,
  FetchTransportRequestOptions,
} from './transports';

export {
  faro,
  allLogLevels,
  BaseExtension,
  BaseInstrumentation,
  BaseTransport,
  Conventions,
  createInternalLogger,
  createPromiseBuffer,
  deepEqual,
  defaultExceptionType,
  defaultGlobalObjectKey,
  defaultInternalLoggerLevel,
  defaultLogLevel,
  genShortID,
  getCurrentTimestamp,
  getInternalFaroFromGlobalObject,
  getTransportBody,
  globalObject,
  internalGlobalObjectKey,
  isArray,
  isBoolean,
  isDomError,
  isDomException,
  isElement,
  isElementDefined,
  isError,
  isErrorDefined,
  isErrorEvent,
  isEvent,
  isEventDefined,
  isFunction,
  isInstanceOf,
  isInt,
  isInternalFaroOnGlobalObject,
  isMap,
  isMapDefined,
  isNull,
  isNumber,
  isObject,
  isPrimitive,
  isRegExp,
  isString,
  isSymbol,
  isSyntheticEvent,
  isThenable,
  isToString,
  isTypeof,
  isUndefined,
  InternalLoggerLevel,
  LogLevel,
  noop,
  setInternalFaroOnGlobalObject,
  TransportItemType,
  transportItemTypeToBodyKey,
  VERSION,
} from '@grafana/faro-core';

export type {
  Faro,
  API,
  APIEvent,
  BaseObject,
  BaseObjectKey,
  BaseObjectPrimitiveValue,
  BaseObjectValue,
  BeforeSendHook,
  BufferItem,
  Config,
  EventAttributes,
  EventEvent,
  EventsAPI,
  ExceptionEvent,
  ExceptionStackFrame,
  ExceptionsAPI,
  ExtendedError,
  Extension,
  GlobalObject,
  Instrumentation,
  Instrumentations,
  InternalLogger,
  LogContext,
  LogEvent,
  LogsAPI,
  MeasurementEvent,
  MeasurementsAPI,
  Meta,
  MetaAPI,
  MetaApp,
  MetaAttributes,
  MetaBrowser,
  MetaGetter,
  MetaItem,
  MetaPage,
  Metas,
  MetaSDK,
  MetaSDKIntegration,
  MetaSession,
  MetaUser,
  MetaView,
  OTELApi,
  Patterns,
  PromiseBuffer,
  PromiseBufferOptions,
  PromiseProducer,
  PushErrorOptions,
  PushLogOptions,
  PushMeasurementOptions,
  Stacktrace,
  StacktraceParser,
  TraceContext,
  TraceEvent,
  TracesAPI,
  Transport,
  TransportBody,
  TransportItem,
  TransportItemPayload,
  Transports,
  UnpatchedConsole,
} from '@grafana/faro-core';