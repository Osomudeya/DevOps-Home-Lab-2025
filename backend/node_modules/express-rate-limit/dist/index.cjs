"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// source/index.ts
var source_exports = {};
__export(source_exports, {
  MemoryStore: () => MemoryStore,
  default: () => lib_default,
  rateLimit: () => lib_default
});
module.exports = __toCommonJS(source_exports);

// source/headers.ts
var getResetSeconds = (resetTime, windowMs) => {
  let resetSeconds = void 0;
  if (resetTime) {
    const deltaSeconds = Math.ceil((resetTime.getTime() - Date.now()) / 1e3);
    resetSeconds = Math.max(0, deltaSeconds);
  } else if (windowMs) {
    resetSeconds = Math.ceil(windowMs / 1e3);
  }
  return resetSeconds;
};
var setLegacyHeaders = (response, info) => {
  if (response.headersSent)
    return;
  response.setHeader("X-RateLimit-Limit", info.limit);
  response.setHeader("X-RateLimit-Remaining", info.remaining);
  if (info.resetTime instanceof Date) {
    response.setHeader("Date", (/* @__PURE__ */ new Date()).toUTCString());
    response.setHeader(
      "X-RateLimit-Reset",
      Math.ceil(info.resetTime.getTime() / 1e3)
    );
  }
};
var setDraft6Headers = (response, info, windowMs) => {
  if (response.headersSent)
    return;
  const windowSeconds = Math.ceil(windowMs / 1e3);
  const resetSeconds = getResetSeconds(info.resetTime);
  response.setHeader("RateLimit-Policy", `${info.limit};w=${windowSeconds}`);
  response.setHeader("RateLimit-Limit", info.limit);
  response.setHeader("RateLimit-Remaining", info.remaining);
  if (resetSeconds)
    response.setHeader("RateLimit-Reset", resetSeconds);
};
var setDraft7Headers = (response, info, windowMs) => {
  if (response.headersSent)
    return;
  const windowSeconds = Math.ceil(windowMs / 1e3);
  const resetSeconds = getResetSeconds(info.resetTime, windowMs);
  response.setHeader("RateLimit-Policy", `${info.limit};w=${windowSeconds}`);
  response.setHeader(
    "RateLimit",
    `limit=${info.limit}, remaining=${info.remaining}, reset=${resetSeconds}`
  );
};
var setRetryAfterHeader = (response, info, windowMs) => {
  if (response.headersSent)
    return;
  const resetSeconds = getResetSeconds(info.resetTime, windowMs);
  response.setHeader("Retry-After", resetSeconds);
};

// source/validations.ts
var import_node_net = require("net");
var ValidationError = class extends Error {
  /**
   * The code must be a string, in snake case and all capital, that starts with
   * the substring `ERR_ERL_`.
   *
   * The message must be a string, starting with an uppercase character,
   * describing the issue in detail.
   */
  constructor(code, message) {
    const url = `https://express-rate-limit.github.io/${code}/`;
    super(`${message} See ${url} for more information.`);
    __publicField(this, "name");
    __publicField(this, "code");
    __publicField(this, "help");
    this.name = this.constructor.name;
    this.code = code;
    this.help = url;
  }
};
var ChangeWarning = class extends ValidationError {
};
var _Validations = class _Validations {
  constructor(enabled) {
    // eslint-disable-next-line @typescript-eslint/parameter-properties
    __publicField(this, "enabled");
    this.enabled = enabled;
  }
  enable() {
    this.enabled = true;
  }
  disable() {
    this.enabled = false;
  }
  /**
   * Checks whether the IP address is valid, and that it does not have a port
   * number in it.
   *
   * See https://github.com/express-rate-limit/express-rate-limit/wiki/Error-Codes#err_erl_invalid_ip_address.
   *
   * @param ip {string | undefined} - The IP address provided by Express as request.ip.
   *
   * @returns {void}
   */
  ip(ip) {
    this.wrap(() => {
      if (ip === void 0) {
        throw new ValidationError(
          "ERR_ERL_UNDEFINED_IP_ADDRESS",
          `An undefined 'request.ip' was detected. This might indicate a misconfiguration or the connection being destroyed prematurely.`
        );
      }
      if (!(0, import_node_net.isIP)(ip)) {
        throw new ValidationError(
          "ERR_ERL_INVALID_IP_ADDRESS",
          `An invalid 'request.ip' (${ip}) was detected. Consider passing a custom 'keyGenerator' function to the rate limiter.`
        );
      }
    });
  }
  /**
   * Makes sure the trust proxy setting is not set to `true`.
   *
   * See https://github.com/express-rate-limit/express-rate-limit/wiki/Error-Codes#err_erl_permissive_trust_proxy.
   *
   * @param request {Request} - The Express request object.
   *
   * @returns {void}
   */
  trustProxy(request) {
    this.wrap(() => {
      if (request.app.get("trust proxy") === true) {
        throw new ValidationError(
          "ERR_ERL_PERMISSIVE_TRUST_PROXY",
          `The Express 'trust proxy' setting is true, which allows anyone to trivially bypass IP-based rate limiting.`
        );
      }
    });
  }
  /**
   * Makes sure the trust proxy setting is set in case the `X-Forwarded-For`
   * header is present.
   *
   * See https://github.com/express-rate-limit/express-rate-limit/wiki/Error-Codes#err_erl_unset_trust_proxy.
   *
   * @param request {Request} - The Express request object.
   *
   * @returns {void}
   */
  xForwardedForHeader(request) {
    this.wrap(() => {
      if (request.headers["x-forwarded-for"] && request.app.get("trust proxy") === false) {
        throw new ValidationError(
          "ERR_ERL_UNEXPECTED_X_FORWARDED_FOR",
          `The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false (default). This could indicate a misconfiguration which would prevent express-rate-limit from accurately identifying users.`
        );
      }
    });
  }
  /**
   * Ensures totalHits value from store is a positive integer.
   *
   * @param hits {any} - The `totalHits` returned by the store.
   */
  positiveHits(hits) {
    this.wrap(() => {
      if (typeof hits !== "number" || hits < 1 || hits !== Math.round(hits)) {
        throw new ValidationError(
          "ERR_ERL_INVALID_HITS",
          `The totalHits value returned from the store must be a positive integer, got ${hits}`
          // eslint-disable-line @typescript-eslint/restrict-template-expressions
        );
      }
    });
  }
  /**
   * Ensures a given key is incremented only once per request.
   *
   * @param request {Request} - The Express request object.
   * @param store {Store} - The store class.
   * @param key {string} - The key used to store the client's hit count.
   *
   * @returns {void}
   */
  singleCount(request, store, key) {
    this.wrap(() => {
      var _a;
      let storeKeys = _Validations.singleCountKeys.get(request);
      if (!storeKeys) {
        storeKeys = /* @__PURE__ */ new Map();
        _Validations.singleCountKeys.set(request, storeKeys);
      }
      const storeKey = store.localKeys ? store : store.constructor.name;
      let keys = storeKeys.get(storeKey);
      if (!keys) {
        keys = [];
        storeKeys.set(storeKey, keys);
      }
      const prefixedKey = `${(_a = store.prefix) != null ? _a : ""}${key}`;
      if (keys.includes(prefixedKey)) {
        throw new ValidationError(
          "ERR_ERL_DOUBLE_COUNT",
          `The hit count for ${key} was incremented more than once for a single request.`
        );
      }
      keys.push(prefixedKey);
    });
  }
  /**
   * Warns the user that the behaviour for `max: 0` is changing in the next
   * major release.
   *
   * @param max {number} - The maximum number of hits per client.
   *
   * @returns {void}
   */
  max(max) {
    this.wrap(() => {
      if (max === 0) {
        throw new ChangeWarning(
          "WRN_ERL_MAX_ZERO",
          `Setting max to 0 disables rate limiting in express-rate-limit v6 and older, but will cause all requests to be blocked in v7`
        );
      }
    });
  }
  /**
   * Warns the user that the `draft_polli_ratelimit_headers` option is deprecated
   * and will be removed in the next major release.
   *
   * @param draft_polli_ratelimit_headers {boolean|undefined} - The now-deprecated setting that was used to enable standard headers.
   *
   * @returns {void}
   */
  draftPolliHeaders(draft_polli_ratelimit_headers) {
    this.wrap(() => {
      if (draft_polli_ratelimit_headers) {
        throw new ChangeWarning(
          "WRN_ERL_DEPRECATED_DRAFT_POLLI_HEADERS",
          `The draft_polli_ratelimit_headers configuration option is deprecated and will be removed in express-rate-limit v7, please set standardHeaders: 'draft-6' instead.`
        );
      }
    });
  }
  /**
   * Warns the user that the `onLimitReached` option is deprecated and will be removed in the next
   * major release.
   *
   * @param onLimitReached {function|undefined} - The maximum number of hits per client.
   *
   * @returns {void}
   */
  onLimitReached(onLimitReached) {
    this.wrap(() => {
      if (onLimitReached) {
        throw new ChangeWarning(
          "WRN_ERL_DEPRECATED_ON_LIMIT_REACHED",
          `The onLimitReached configuration option is deprecated and will be removed in express-rate-limit v7.`
        );
      }
    });
  }
  /**
   * Warns the user when the selected headers option requires a reset time but
   * the store does not provide one.
   *
   * @param resetTime {Date | undefined} - The timestamp when the client's hit count will be reset.
   *
   * @returns {void}
   */
  headersResetTime(resetTime) {
    this.wrap(() => {
      if (!resetTime) {
        throw new ValidationError(
          "ERR_ERL_HEADERS_NO_RESET",
          `standardHeaders:  'draft-7' requires a 'resetTime', but the store did not provide one. The 'windowMs' value will be used instead, which may cause clients to wait longer than necessary.`
        );
      }
    });
  }
  wrap(validation) {
    if (!this.enabled) {
      return;
    }
    try {
      validation.call(this);
    } catch (error) {
      if (error instanceof ChangeWarning)
        console.warn(error);
      else
        console.error(error);
    }
  }
};
/**
 * Maps the key used in a store for a certain request, and ensures that the
 * same key isn't used more than once per request.
 *
 * The store can be any one of the following:
 *  - An instance, for stores like the MemoryStore where two instances do not
 *    share state.
 *  - A string (class name), for stores where multiple instances
 *    typically share state, such as the Redis store.
 */
__publicField(_Validations, "singleCountKeys", /* @__PURE__ */ new WeakMap());
var Validations = _Validations;

// source/memory-store.ts
var calculateNextResetTime = (windowMs) => {
  const resetTime = /* @__PURE__ */ new Date();
  resetTime.setMilliseconds(resetTime.getMilliseconds() + windowMs);
  return resetTime;
};
var MemoryStore = class {
  constructor() {
    /**
     * The duration of time before which all hit counts are reset (in milliseconds).
     */
    __publicField(this, "windowMs");
    /**
     * The map that stores the number of hits for each client in memory.
     */
    __publicField(this, "hits");
    /**
     * The time at which all hit counts will be reset.
     */
    __publicField(this, "resetTime");
    /**
     * Reference to the active timer.
     */
    __publicField(this, "interval");
    /**
     * Confirmation that the keys incremented in once instance of MemoryStore
     * cannot affect other instances.
     */
    __publicField(this, "localKeys", true);
  }
  /**
   * Method that initializes the store.
   *
   * @param options {Options} - The options used to setup the middleware.
   */
  init(options) {
    this.windowMs = options.windowMs;
    this.resetTime = calculateNextResetTime(this.windowMs);
    this.hits = {};
    this.interval = setInterval(async () => {
      await this.resetAll();
    }, this.windowMs);
    if (this.interval.unref)
      this.interval.unref();
  }
  /**
   * Method to fetch a client's hit count and reset time.
   *
   * @param key {string} - The identifier for a client.
   *
   * @returns {ClientRateLimitInfo | undefined} - The number of hits and reset time for that client.
   *
   * @public
   */
  async get(key) {
    if (this.hits[key] !== void 0)
      return {
        totalHits: this.hits[key],
        resetTime: this.resetTime
      };
    return void 0;
  }
  /**
   * Method to increment a client's hit counter.
   *
   * @param key {string} - The identifier for a client.
   *
   * @returns {ClientRateLimitInfo} - The number of hits and reset time for that client.
   *
   * @public
   */
  async increment(key) {
    var _a;
    const totalHits = ((_a = this.hits[key]) != null ? _a : 0) + 1;
    this.hits[key] = totalHits;
    return {
      totalHits,
      resetTime: this.resetTime
    };
  }
  /**
   * Method to decrement a client's hit counter.
   *
   * @param key {string} - The identifier for a client.
   *
   * @public
   */
  async decrement(key) {
    const current = this.hits[key];
    if (current)
      this.hits[key] = current - 1;
  }
  /**
   * Method to reset a client's hit counter.
   *
   * @param key {string} - The identifier for a client.
   *
   * @public
   */
  async resetKey(key) {
    delete this.hits[key];
  }
  /**
   * Method to reset everyone's hit counter.
   *
   * @public
   */
  async resetAll() {
    this.hits = {};
    this.resetTime = calculateNextResetTime(this.windowMs);
  }
  /**
   * Method to stop the timer (if currently running) and prevent any memory
   * leaks.
   *
   * @public
   */
  shutdown() {
    clearInterval(this.interval);
  }
};

// source/lib.ts
var isLegacyStore = (store) => (
  // Check that `incr` exists but `increment` does not - store authors might want
  // to keep both around for backwards compatibility.
  typeof store.incr === "function" && typeof store.increment !== "function"
);
var promisifyStore = (passedStore) => {
  if (!isLegacyStore(passedStore)) {
    return passedStore;
  }
  const legacyStore = passedStore;
  class PromisifiedStore {
    /* istanbul ignore next */
    async get(key) {
      return void 0;
    }
    async increment(key) {
      return new Promise((resolve, reject) => {
        legacyStore.incr(
          key,
          (error, totalHits, resetTime) => {
            if (error)
              reject(error);
            resolve({ totalHits, resetTime });
          }
        );
      });
    }
    async decrement(key) {
      return legacyStore.decrement(key);
    }
    async resetKey(key) {
      return legacyStore.resetKey(key);
    }
    /* istanbul ignore next */
    async resetAll() {
      if (typeof legacyStore.resetAll === "function")
        return legacyStore.resetAll();
    }
  }
  return new PromisifiedStore();
};
var getOptionsFromConfig = (config) => {
  const { validations, ...directlyPassableEntries } = config;
  return {
    ...directlyPassableEntries,
    validate: validations.enabled
  };
};
var omitUndefinedOptions = (passedOptions) => {
  const omittedOptions = {};
  for (const k of Object.keys(passedOptions)) {
    const key = k;
    if (passedOptions[key] !== void 0) {
      omittedOptions[key] = passedOptions[key];
    }
  }
  return omittedOptions;
};
var parseOptions = (passedOptions) => {
  var _a, _b, _c, _d;
  const notUndefinedOptions = omitUndefinedOptions(passedOptions);
  const validations = new Validations((_a = notUndefinedOptions == null ? void 0 : notUndefinedOptions.validate) != null ? _a : true);
  validations.draftPolliHeaders(
    notUndefinedOptions.draft_polli_ratelimit_headers
  );
  validations.onLimitReached(notUndefinedOptions.onLimitReached);
  let standardHeaders = (_b = notUndefinedOptions.standardHeaders) != null ? _b : false;
  if (standardHeaders === true || standardHeaders === void 0 && notUndefinedOptions.draft_polli_ratelimit_headers) {
    standardHeaders = "draft-6";
  }
  const config = {
    windowMs: 60 * 1e3,
    max: 5,
    message: "Too many requests, please try again later.",
    statusCode: 429,
    legacyHeaders: (_c = passedOptions.headers) != null ? _c : true,
    requestPropertyName: "rateLimit",
    skipFailedRequests: false,
    skipSuccessfulRequests: false,
    requestWasSuccessful: (_request, response) => response.statusCode < 400,
    skip: (_request, _response) => false,
    keyGenerator(request, _response) {
      validations.ip(request.ip);
      validations.trustProxy(request);
      validations.xForwardedForHeader(request);
      return request.ip;
    },
    async handler(request, response, _next, _optionsUsed) {
      response.status(config.statusCode);
      const message = typeof config.message === "function" ? await config.message(
        request,
        response
      ) : config.message;
      if (!response.writableEnded) {
        response.send(message);
      }
    },
    onLimitReached(_request, _response, _optionsUsed) {
    },
    // Allow the default options to be overriden by the options passed to the middleware.
    ...notUndefinedOptions,
    // `standardHeaders` is resolved into a draft version above, use that.
    standardHeaders,
    // Note that this field is declared after the user's options are spread in,
    // so that this field doesn't get overriden with an un-promisified store!
    store: promisifyStore((_d = notUndefinedOptions.store) != null ? _d : new MemoryStore()),
    // Print an error to the console if a few known misconfigurations are detected.
    validations
  };
  if (typeof config.store.increment !== "function" || typeof config.store.decrement !== "function" || typeof config.store.resetKey !== "function" || config.store.resetAll !== void 0 && typeof config.store.resetAll !== "function" || config.store.init !== void 0 && typeof config.store.init !== "function") {
    throw new TypeError(
      "An invalid store was passed. Please ensure that the store is a class that implements the `Store` interface."
    );
  }
  return config;
};
var handleAsyncErrors = (fn) => async (request, response, next) => {
  try {
    await Promise.resolve(fn(request, response, next)).catch(next);
  } catch (error) {
    next(error);
  }
};
var rateLimit = (passedOptions) => {
  var _a;
  const config = parseOptions(passedOptions != null ? passedOptions : {});
  const options = getOptionsFromConfig(config);
  if (typeof config.store.init === "function")
    config.store.init(options);
  const middleware = handleAsyncErrors(
    async (request, response, next) => {
      const skip = await config.skip(request, response);
      if (skip) {
        next();
        return;
      }
      const augmentedRequest = request;
      const key = await config.keyGenerator(request, response);
      const { totalHits, resetTime } = await config.store.increment(key);
      config.validations.positiveHits(totalHits);
      config.validations.singleCount(request, config.store, key);
      const retrieveQuota = typeof config.max === "function" ? config.max(request, response) : config.max;
      const maxHits = await retrieveQuota;
      config.validations.max(maxHits);
      const info = {
        limit: maxHits,
        current: totalHits,
        remaining: Math.max(maxHits - totalHits, 0),
        resetTime
      };
      augmentedRequest[config.requestPropertyName] = info;
      if (config.legacyHeaders && !response.headersSent) {
        setLegacyHeaders(response, info);
      }
      if (config.standardHeaders && !response.headersSent) {
        if (config.standardHeaders === "draft-6") {
          setDraft6Headers(response, info, config.windowMs);
        } else if (config.standardHeaders === "draft-7") {
          config.validations.headersResetTime(info.resetTime);
          setDraft7Headers(response, info, config.windowMs);
        }
      }
      if (config.skipFailedRequests || config.skipSuccessfulRequests) {
        let decremented = false;
        const decrementKey = async () => {
          if (!decremented) {
            await config.store.decrement(key);
            decremented = true;
          }
        };
        if (config.skipFailedRequests) {
          response.on("finish", async () => {
            if (!config.requestWasSuccessful(request, response))
              await decrementKey();
          });
          response.on("close", async () => {
            if (!response.writableEnded)
              await decrementKey();
          });
          response.on("error", async () => {
            await decrementKey();
          });
        }
        if (config.skipSuccessfulRequests) {
          response.on("finish", async () => {
            if (config.requestWasSuccessful(request, response))
              await decrementKey();
          });
        }
      }
      if (maxHits && totalHits === maxHits + 1) {
        config.onLimitReached(request, response, options);
      }
      config.validations.disable();
      if (maxHits && totalHits > maxHits) {
        if (config.legacyHeaders || config.standardHeaders) {
          setRetryAfterHeader(response, info, config.windowMs);
        }
        config.handler(request, response, next, options);
        return;
      }
      next();
    }
  );
  middleware.resetKey = config.store.resetKey.bind(config.store);
  middleware.getKey = (_a = config.store.get) == null ? void 0 : _a.bind(
    config.store
  );
  return middleware;
};
var lib_default = rateLimit;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MemoryStore,
  rateLimit
});
module.exports = rateLimit; module.exports.default = rateLimit; module.exports.rateLimit = rateLimit; module.exports.MemoryStore = MemoryStore;
