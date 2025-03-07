import * as faroCore from '@grafana/faro-core';
import { initializeFaro } from '@grafana/faro-core';
import type { MetaSession } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import { getSessionManagerByConfig } from './getSessionManagerByConfig';
import { PersistentSessionsManager } from './PersistentSessionsManager';
import * as samplingModule from './sampling';
import { SESSION_EXPIRATION_TIME, SESSION_INACTIVITY_TIME } from './sessionConstants';
import * as mockSessionManagerUtils from './sessionManagerUtils';
import {
  addSessionMetadataToNextSession,
  createUserSessionObject,
  getUserSessionUpdater,
  isUserSessionValid,
} from './sessionManagerUtils';
import type { FaroUserSession } from './types';
import { VolatileSessionsManager } from './VolatileSessionManager';

const fakeSystemTime = new Date('2023-01-01').getTime();
const mockSessionId = '123';

describe('sessionManagerUtils', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fakeSystemTime);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('creates new user session object', () => {
    jest.spyOn(faroCore, 'genShortID').mockReturnValueOnce(mockSessionId);

    // create new id
    const newSession = createUserSessionObject();

    expect(newSession).toStrictEqual({
      sessionId: mockSessionId,
      lastActivity: fakeSystemTime,
      started: fakeSystemTime,
      isSampled: true,
    });

    // create with given sessionId
    const mockInitialSessionId = 'abcde';
    const newSessionWithInitialSessionId = createUserSessionObject({ sessionId: mockInitialSessionId });

    expect(newSessionWithInitialSessionId).toStrictEqual({
      sessionId: mockInitialSessionId,
      lastActivity: fakeSystemTime,
      started: fakeSystemTime,
      isSampled: true,
    });
  });

  it('creates new user session object and uses user defined generateSessionId', () => {
    const customGeneratedSessionId = 'my-custom-id';

    const config = mockConfig({
      sessionTracking: {
        enabled: true,
        generateSessionId() {
          return customGeneratedSessionId;
        },
      },
    });

    initializeFaro(config);

    const newSessionWithInitialSessionId = createUserSessionObject();

    expect(newSessionWithInitialSessionId).toStrictEqual({
      sessionId: customGeneratedSessionId,
      lastActivity: fakeSystemTime,
      started: fakeSystemTime,
      isSampled: true,
    });
  });

  it('checks if user session is valid', () => {
    jest.spyOn(faroCore, 'genShortID').mockReturnValueOnce(mockSessionId);

    // return false if session is null
    const isNullSessionInvalid = isUserSessionValid(null);
    expect(isNullSessionInvalid).toBe(false);

    // return false if activity timeout is reached
    const newInactiveSession = createUserSessionObject();
    newInactiveSession.lastActivity = SESSION_INACTIVITY_TIME;
    const isActivityTimeoutSessionInvalid = isUserSessionValid(newInactiveSession);
    expect(isActivityTimeoutSessionInvalid).toBe(false);

    // return false if lifetime timeout is reached
    const newTimedOutSession = createUserSessionObject();
    newTimedOutSession.started -= SESSION_EXPIRATION_TIME;
    const isTimedOutSessionInvalid = isUserSessionValid(newTimedOutSession);
    expect(isTimedOutSessionInvalid).toBe(false);

    // return false if session is null
    const isNullSessionValid = isUserSessionValid(createUserSessionObject());
    expect(isNullSessionValid).toBe(true);

    // return false if activity timeout is reached
    const newActiveSession = createUserSessionObject();
    newActiveSession.lastActivity = fakeSystemTime - 1;
    const isActivityTimeoutSessionValid = isUserSessionValid(newActiveSession);
    expect(isActivityTimeoutSessionValid).toBe(true);

    // return false if lifetime timeout is reached
    const newSessionWithValidLifetime = createUserSessionObject();
    newSessionWithValidLifetime.started -= SESSION_EXPIRATION_TIME - 1;
    const isTimedOutSessionValid = isUserSessionValid(newSessionWithValidLifetime);
    expect(isTimedOutSessionValid).toBe(true);
  });

  it('configures userSessionUpdater and expands the current user session as well as the current sessionMeta', () => {
    const mockOnSessionChange = jest.fn();

    const config = mockConfig({
      sessionTracking: {
        enabled: true,
        onSessionChange: mockOnSessionChange,
      },
    });

    const faro = initializeFaro(config);

    const mockFetchUserSession = jest.fn();
    const mockStoreUserSession = jest.fn();

    const updateSession = getUserSessionUpdater({
      fetchUserSession: mockFetchUserSession,
      storeUserSession: mockStoreUserSession,
    });

    // session is invalid
    jest.spyOn(mockSessionManagerUtils, 'isUserSessionValid').mockReturnValueOnce(false);

    const mockSetSession = jest.fn();
    jest.spyOn(faro.api, 'setSession').mockImplementationOnce(mockSetSession);

    mockFetchUserSession.mockReturnValueOnce({
      sessionId: 'abc',
      attributes: {
        previousSession: 'previousSession',
      },
    });

    jest.spyOn(faroCore, 'genShortID').mockReturnValueOnce(mockSessionId);

    updateSession();

    expect(mockFetchUserSession).toHaveBeenCalledTimes(1);
    expect(mockStoreUserSession).toHaveBeenCalledTimes(1);
    expect(mockSetSession).toHaveBeenCalledTimes(1);
    expect(mockOnSessionChange).toHaveBeenCalledTimes(1);

    expect(mockSetSession).toHaveBeenCalledWith({
      id: mockSessionId,
      attributes: {
        previousSession: 'abc',
        isSampled: 'true',
      },
    });

    expect(mockOnSessionChange).toHaveBeenCalledWith(null, {
      attributes: { previousSession: 'abc', isSampled: 'true' },
      id: '123',
    });
  });

  it('configures userSessionUpdater and expands the current user session as well as the current sessionMeta for a session which already got expanded', () => {
    const currentSessionMeta = {
      id: 'currentSession',
      attributes: {
        previousSession: 'previous',
        isSampled: 'true',
      },
    };

    const mockOnSessionChange = jest.fn();

    const config = mockConfig({
      sessionTracking: {
        enabled: true,
        onSessionChange: mockOnSessionChange,
        session: currentSessionMeta,
      },
    });

    const faro = initializeFaro(config);

    const mockFetchUserSession = jest.fn();
    const mockStoreUserSession = jest.fn();

    const updateSession = getUserSessionUpdater({
      fetchUserSession: mockFetchUserSession,
      storeUserSession: mockStoreUserSession,
    });

    // session is invalid
    jest.spyOn(mockSessionManagerUtils, 'isUserSessionValid').mockReturnValueOnce(false);

    const mockSetSession = jest.fn();
    jest.spyOn(faro.api, 'setSession').mockImplementationOnce(mockSetSession);

    mockFetchUserSession.mockReturnValue({
      sessionId: currentSessionMeta.id,
      attributes: {
        previousSession: currentSessionMeta.attributes.previousSession,
      },
      sessionMeta: currentSessionMeta,
    });

    const nextSessionId = 'nextSession';
    jest.spyOn(faroCore, 'genShortID').mockReturnValueOnce(nextSessionId);

    updateSession();

    const newSessionMeta = {
      id: nextSessionId,
      attributes: {
        previousSession: currentSessionMeta.id,
        isSampled: 'true',
      },
    };

    expect(mockSetSession).toHaveBeenCalledWith(newSessionMeta);

    expect(mockOnSessionChange).toHaveBeenCalledWith(currentSessionMeta, newSessionMeta);
  });

  it('Takes session object and adds meta data', () => {
    const config = mockConfig({});
    const { api } = initializeFaro(config);

    const newSession: FaroUserSession = {
      lastActivity: 1,
      started: 2,
      sessionId: 'new-session-id',
      isSampled: true,
    };

    const sessionWithMetadata1 = addSessionMetadataToNextSession(newSession, null);

    expect(sessionWithMetadata1).toStrictEqual({
      ...newSession,
      sessionMeta: {
        id: newSession.sessionId,
        attributes: {
          isSampled: 'true',
        },
      },
    });

    const previousSession: FaroUserSession = {
      lastActivity: 8,
      started: 9,
      sessionId: 'previous-session-id',
      isSampled: true,
    };

    const sessionWithMetadata2 = addSessionMetadataToNextSession(newSession, previousSession);

    expect(sessionWithMetadata2).toStrictEqual({
      ...newSession,
      sessionMeta: {
        id: newSession.sessionId,
        attributes: {
          previousSession: previousSession.sessionId,
          isSampled: 'true',
        },
      },
    });

    const sessionMeta = {
      id: previousSession.sessionId,
      attributes: {
        previousSession: '12345',
        foo: 'bar',
        baz: 'bam',
      },
    };

    api.setSession(sessionMeta);

    const sessionWithMetadata3 = addSessionMetadataToNextSession(newSession, previousSession);

    expect(sessionWithMetadata3).toStrictEqual({
      ...newSession,
      sessionMeta: {
        id: newSession.sessionId,
        attributes: {
          ...sessionMeta.attributes,
          isSampled: 'true',
          previousSession: previousSession.sessionId,
        },
      },
    });
  });

  it('Takes session object and adds overrides', () => {
    const config = mockConfig({});
    const { api } = initializeFaro(config);

    const newSession: FaroUserSession = {
      lastActivity: 1,
      started: 2,
      sessionId: 'new-session-id',
      isSampled: true,
    };

    const sessionWithMetadata1 = addSessionMetadataToNextSession(newSession, null);

    expect(sessionWithMetadata1).toStrictEqual({
      ...newSession,
      sessionMeta: {
        id: newSession.sessionId,
        attributes: {
          isSampled: 'true',
        },
      },
    });

    const previousSession: FaroUserSession = {
      lastActivity: 8,
      started: 9,
      sessionId: 'previous-session-id',
      isSampled: true,
    };

    const overrides = {
      serviceName: 'my-service',
    };

    api.setSession(undefined, { overrides });

    const sessionWithOverrides = addSessionMetadataToNextSession(newSession, previousSession);

    expect(sessionWithOverrides).toStrictEqual({
      ...newSession,
      sessionMeta: {
        id: newSession.sessionId,
        overrides,
        attributes: {
          previousSession: previousSession.sessionId,
          isSampled: 'true',
        },
      },
    });
  });

  it('forces userSessionUpdater to expand the current user session', () => {
    const mockOnSessionChange = jest.fn();

    const config = mockConfig({
      sessionTracking: {
        enabled: true,
        onSessionChange: mockOnSessionChange,
      },
    });

    const faro = initializeFaro(config);

    const mockIsUserSessionValid = jest.fn();
    jest.spyOn(mockSessionManagerUtils, 'isUserSessionValid').mockImplementationOnce(() => {
      mockIsUserSessionValid();
      return true;
    });

    const mockFetchUserSession = jest.fn();
    const mockStoreUserSession = jest.fn();

    const updateSession = getUserSessionUpdater({
      fetchUserSession: mockFetchUserSession,
      storeUserSession: mockStoreUserSession,
    });

    const mockSetSession = jest.fn();
    jest.spyOn(faro.api, 'setSession').mockImplementationOnce(mockSetSession);

    updateSession({ forceSessionExtend: true });

    expect(mockFetchUserSession).toHaveBeenCalledTimes(1);

    expect(mockIsUserSessionValid).not.toHaveBeenCalled();

    expect(mockStoreUserSession).toHaveBeenCalledTimes(1);
    expect(mockSetSession).toHaveBeenCalledTimes(1);
    expect(mockOnSessionChange).toHaveBeenCalledTimes(1);
  });

  it('Returns the configured session manager', () => {
    let SessionManager = getSessionManagerByConfig({ persistent: false /* default */ });
    expect(new SessionManager()).toBeInstanceOf(VolatileSessionsManager);

    SessionManager = getSessionManagerByConfig({ persistent: true });
    expect(new SessionManager()).toBeInstanceOf(PersistentSessionsManager);
  });

  describe('sessionMetaUpdateHandler', () => {
    it('Creates a new Faro user session if new sessionID is set', () => {
      const mockIsSampled = jest.fn();
      jest.spyOn(samplingModule, 'isSampled').mockImplementationOnce(mockIsSampled);

      const mockStoreUserSession = jest.fn();
      jest.spyOn(VolatileSessionsManager, 'storeUserSession').mockImplementationOnce(mockStoreUserSession);

      initializeFaro(mockConfig({}));

      const handler = mockSessionManagerUtils.getSessionMetaUpdateHandler({
        fetchUserSession: VolatileSessionsManager.fetchUserSession,
        storeUserSession: VolatileSessionsManager.storeUserSession,
      });

      const newSessionId = 'new-session-id';
      handler({
        session: {
          id: newSessionId,
        },
      });

      expect(mockStoreUserSession).toHaveBeenCalledTimes(1);
      expect(mockStoreUserSession).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: newSessionId,
        })
      );
    });

    it('Updates session attributes without creating a new Faro user session if only attributes have changed', () => {
      const mockStoreUserSession = jest.fn();
      jest.spyOn(VolatileSessionsManager, 'storeUserSession').mockImplementationOnce(mockStoreUserSession);

      const storedSession: FaroUserSession = {
        sessionId: mockSessionId,
        isSampled: true,
        lastActivity: fakeSystemTime,
        started: fakeSystemTime,
        sessionMeta: {
          id: mockSessionId,
          attributes: {
            isSampled: 'true',
          },
        },
      };

      jest.spyOn(VolatileSessionsManager, 'fetchUserSession').mockReturnValueOnce(storedSession);

      const handler = mockSessionManagerUtils.getSessionMetaUpdateHandler({
        fetchUserSession: VolatileSessionsManager.fetchUserSession,
        storeUserSession: VolatileSessionsManager.storeUserSession,
      });

      const faro = initializeFaro(mockConfig({}));

      // after user calls set session, the session meta is updated and the handler is called
      // since we test the handler, we need to simulate the session meta update
      faro.api.setSession({
        id: mockSessionId,
        attributes: {
          isSampled: 'true',
          foo: 'bar',
        },
      });

      handler(faro.metas.value);

      expect(mockStoreUserSession).toHaveBeenCalledTimes(1);
      expect(mockStoreUserSession).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: mockSessionId,
          isSampled: true,
          sessionMeta: expect.objectContaining({
            attributes: expect.objectContaining({
              foo: 'bar',
            }),
          }),
        })
      );
    });

    it('Updates session overrides without creating a new Faro user session if only overrides have changed', () => {
      const mockStoreUserSession = jest.fn();
      jest.spyOn(VolatileSessionsManager, 'storeUserSession').mockImplementationOnce(mockStoreUserSession);

      const storedSession: FaroUserSession = {
        sessionId: mockSessionId,
        isSampled: true,
        lastActivity: fakeSystemTime,
        started: fakeSystemTime,
        sessionMeta: {
          id: mockSessionId,
          attributes: {
            isSampled: 'true',
            foo: 'bar',
          },
        },
      };

      jest.spyOn(VolatileSessionsManager, 'fetchUserSession').mockReturnValueOnce(storedSession);

      const handler = mockSessionManagerUtils.getSessionMetaUpdateHandler({
        fetchUserSession: VolatileSessionsManager.fetchUserSession,
        storeUserSession: VolatileSessionsManager.storeUserSession,
      });

      const faro = initializeFaro(mockConfig({ sessionTracking: { session: storedSession.sessionMeta } }));

      const newOverrides = { serviceName: 'my-service' };

      // after user calls set session, the session meta is updated and the handler is called
      // since we test the handler, we need to simulate the session meta update
      // faro.api.setSession({ id: 'ABC' }, { overrides: newOverrides });
      faro.api.setSession(storedSession.sessionMeta, { overrides: newOverrides });

      handler(faro.metas.value);

      expect(mockStoreUserSession).toHaveBeenCalledTimes(1);
      expect(mockStoreUserSession).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: mockSessionId,
          isSampled: true,
          sessionMeta: expect.objectContaining({
            id: mockSessionId,
            overrides: newOverrides,
            attributes: expect.objectContaining({
              foo: 'bar',
            }),
          }),
        })
      );
    });

    it('creates a new session with overrides if the session is empty and only overrides are available', () => {
      const mockStoreUserSession = jest.fn();
      jest.spyOn(VolatileSessionsManager, 'storeUserSession').mockImplementationOnce(mockStoreUserSession);

      const handler = mockSessionManagerUtils.getSessionMetaUpdateHandler({
        fetchUserSession: VolatileSessionsManager.fetchUserSession,
        storeUserSession: VolatileSessionsManager.storeUserSession,
      });

      const faro = initializeFaro(mockConfig({}));

      const newOverrides = { serviceName: 'my-service' };

      // Simulate setting session with only overrides
      faro.api.setSession(undefined, { overrides: newOverrides });

      handler(faro.metas.value);

      expect(mockStoreUserSession).toHaveBeenCalledTimes(1);
      expect(mockStoreUserSession).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: expect.any(String),
          isSampled: true,
          sessionMeta: expect.objectContaining({
            overrides: newOverrides,
          }),
        })
      );
    });

    it('does not create a new session if overrides are added via the setView API', () => {
      const mockStoreUserSession = jest.fn();
      jest.spyOn(VolatileSessionsManager, 'storeUserSession').mockImplementationOnce(mockStoreUserSession);

      const handler = mockSessionManagerUtils.getSessionMetaUpdateHandler({
        fetchUserSession: VolatileSessionsManager.fetchUserSession,
        storeUserSession: VolatileSessionsManager.storeUserSession,
      });

      const initialSession: MetaSession = {
        id: mockSessionId,
        attributes: {
          isSampled: 'true',
          foo: 'bar',
        },
      };

      const faro = initializeFaro(mockConfig({ sessionTracking: { session: initialSession } }));

      const newOverrides = { serviceName: 'my-service' };

      // Simulate setting session with only overrides
      faro.api.setView({ name: 'my-service-view' }, { overrides: newOverrides });

      handler(faro.metas.value);

      expect(mockStoreUserSession).toHaveBeenCalledTimes(1);
      expect(mockStoreUserSession).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: initialSession.id,
          isSampled: true,
          sessionMeta: expect.objectContaining({
            ...initialSession,
            overrides: newOverrides,
          }),
        })
      );
    });

    it('send a serviceName override event if the service name has changed the first time', () => {
      const faro = initializeFaro(
        mockConfig({
          app: {
            name: 'my-app',
            version: '1.0.0',
          },
        })
      );

      const handler = mockSessionManagerUtils.getSessionMetaUpdateHandler({
        fetchUserSession: VolatileSessionsManager.fetchUserSession,
        storeUserSession: VolatileSessionsManager.storeUserSession,
      });

      let newOverrides = { serviceName: 'my-service' };

      const mockPushEvent = jest.fn();
      jest.spyOn(faro.api, 'pushEvent').mockImplementationOnce(mockPushEvent);

      handler({
        session: {
          id: mockSessionId,
          overrides: newOverrides,
        },
      });

      expect(mockPushEvent).toHaveBeenCalledTimes(1);
      expect(mockPushEvent).toHaveBeenCalledWith('service_name_override', {
        serviceName: 'my-service',
        previousServiceName: 'my-app',
      });
    });

    it('sends a serviceName override event if the service name has at least changed once already', () => {
      const previouslyChangedSession: MetaSession = {
        id: mockSessionId,
        overrides: {
          serviceName: 'my-service',
        },
      };

      let faro = initializeFaro(
        mockConfig({
          app: {
            name: 'my-app',
            version: '1.0.0',
          },
          sessionTracking: {
            session: previouslyChangedSession,
          },
        })
      );

      jest.spyOn(VolatileSessionsManager, 'fetchUserSession').mockReturnValueOnce({
        sessionId: mockSessionId,
        isSampled: true,
        lastActivity: fakeSystemTime,
        started: fakeSystemTime,
        sessionMeta: previouslyChangedSession,
      });

      const handler = mockSessionManagerUtils.getSessionMetaUpdateHandler({
        fetchUserSession: VolatileSessionsManager.fetchUserSession,
        storeUserSession: VolatileSessionsManager.storeUserSession,
      });

      const mockPushEvent = jest.fn();
      jest.spyOn(faro.api, 'pushEvent').mockImplementationOnce(mockPushEvent);

      const newOverrides = { serviceName: 'my-new-service' };

      handler({
        session: {
          id: mockSessionId,
          overrides: newOverrides,
        },
      });

      expect(mockPushEvent).toHaveBeenCalledTimes(1);
      expect(mockPushEvent).toHaveBeenCalledWith('service_name_override', {
        serviceName: 'my-new-service',
        previousServiceName: 'my-service',
      });
    });
  });
});
