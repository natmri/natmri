import type { ParentPort } from './electron'

export interface Process {
  /**
   * The `process.cwd()` method returns the current working directory of the Node.js
   * process.
   *
   * ```js
   * import { cwd } from 'process';
   *
   * console.log(`Current directory: ${cwd()}`);
   * ```
   * @since v0.1.8
   */
  cwd(): string;
  /**
   * The `process.env` property returns an object containing the user environment.
   * See [`environ(7)`](http://man7.org/linux/man-pages/man7/environ.7.html).
   *
   * An example of this object looks like:
   *
   * ```js
   * {
   *   TERM: 'xterm-256color',
   *   SHELL: '/usr/local/bin/bash',
   *   USER: 'maciej',
   *   PATH: '~/.bin/:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin',
   *   PWD: '/Users/maciej',
   *   EDITOR: 'vim',
   *   SHLVL: '1',
   *   HOME: '/Users/maciej',
   *   LOGNAME: 'maciej',
   *   _: '/usr/local/bin/node'
   * }
   * ```
   *
   * It is possible to modify this object, but such modifications will not be
   * reflected outside the Node.js process, or (unless explicitly requested)
   * to other `Worker` threads.
   * In other words, the following example would not work:
   *
   * ```console
   * $ node -e 'process.env.foo = "bar"' &#x26;&#x26; echo $foo
   * ```
   *
   * While the following will:
   *
   * ```js
   * import { env } from 'process';
   *
   * env.foo = 'bar';
   * console.log(env.foo);
   * ```
   *
   * Assigning a property on `process.env` will implicitly convert the value
   * to a string. **This behavior is deprecated.** Future versions of Node.js may
   * throw an error when the value is not a string, number, or boolean.
   *
   * ```js
   * import { env } from 'process';
   *
   * env.test = null;
   * console.log(env.test);
   * // => 'null'
   * env.test = undefined;
   * console.log(env.test);
   * // => 'undefined'
   * ```
   *
   * Use `delete` to delete a property from `process.env`.
   *
   * ```js
   * import { env } from 'process';
   *
   * env.TEST = 1;
   * delete env.TEST;
   * console.log(env.TEST);
   * // => undefined
   * ```
   *
   * On Windows operating systems, environment variables are case-insensitive.
   *
   * ```js
   * import { env } from 'process';
   *
   * env.TEST = 1;
   * console.log(env.test);
   * // => 1
   * ```
   *
   * Unless explicitly specified when creating a `Worker` instance,
   * each `Worker` thread has its own copy of `process.env`, based on its
   * parent thread’s `process.env`, or whatever was specified as the `env` option
   * to the `Worker` constructor. Changes to `process.env` will not be visible
   * across `Worker` threads, and only the main thread can make changes that
   * are visible to the operating system or to native add-ons.
   * @since v0.1.27
   */
  env: NodeJS.ProcessEnv;
  /**
   * The `process.version` property contains the Node.js version string.
   *
   * ```js
   * import { version } from 'process';
   *
   * console.log(`Version: ${version}`);
   * // Version: v14.8.0
   * ```
   *
   * To get the version string without the prepended _v_, use`process.versions.node`.
   * @since v0.1.3
   */
  readonly version: string;
  /**
   * The `process.versions` property returns an object listing the version strings of
   * Node.js and its dependencies. `process.versions.modules` indicates the current
   * ABI version, which is increased whenever a C++ API changes. Node.js will refuse
   * to load modules that were compiled against a different module ABI version.
   *
   * ```js
   * import { versions } from 'process';
   *
   * console.log(versions);
   * ```
   *
   * Will generate an object similar to:
   *
   * ```console
   * { node: '11.13.0',
   *   v8: '7.0.276.38-node.18',
   *   uv: '1.27.0',
   *   zlib: '1.2.11',
   *   brotli: '1.0.7',
   *   ares: '1.15.0',
   *   modules: '67',
   *   nghttp2: '1.34.0',
   *   napi: '4',
   *   llhttp: '1.1.1',
   *   openssl: '1.1.1b',
   *   cldr: '34.0',
   *   icu: '63.1',
   *   tz: '2018e',
   *   unicode: '11.0' }
   * ```
   * @since v0.2.0
   */
  readonly versions: NodeJS.ProcessVersions;
  /**
   * The operating system CPU architecture for which the Node.js binary was compiled.
   * Possible values are: `'arm'`, `'arm64'`, `'ia32'`, `'mips'`,`'mipsel'`, `'ppc'`,`'ppc64'`, `'s390'`, `'s390x'`, and `'x64'`.
   *
   * ```js
   * import { arch } from 'process';
   *
   * console.log(`This processor architecture is ${arch}`);
   * ```
   * @since v0.5.0
   */
  readonly arch: Architecture;
  /**
   * The `process.platform` property returns a string identifying the operating
   * system platform for which the Node.js binary was compiled.
   *
   * Currently possible values are:
   *
   * * `'aix'`
   * * `'darwin'`
   * * `'freebsd'`
   * * `'linux'`
   * * `'openbsd'`
   * * `'sunos'`
   * * `'win32'`
   *
   * ```js
   * import { platform } from 'process';
   *
   * console.log(`This platform is ${platform}`);
   * ```
   *
   * The value `'android'` may also be returned if the Node.js is built on the
   * Android operating system. However, Android support in Node.js [is experimental](https://github.com/nodejs/node/blob/HEAD/BUILDING.md#androidandroid-based-devices-eg-firefox-os).
   * @since v0.1.16
   */
  readonly platform: NodeJS.Platform;
  /**
   * The `process.cpuUsage()` method returns the user and system CPU time usage of
   * the current process, in an object with properties `user` and `system`, whose
   * values are microsecond values (millionth of a second). These values measure time
   * spent in user and system code respectively, and may end up being greater than
   * actual elapsed time if multiple CPU cores are performing work for this process.
   *
   * The result of a previous call to `process.cpuUsage()` can be passed as the
   * argument to the function, to get a diff reading.
   *
   * ```js
   * import { cpuUsage } from 'process';
   *
   * const startUsage = cpuUsage();
   * // { user: 38579, system: 6986 }
   *
   * // spin the CPU for 500 milliseconds
   * const now = Date.now();
   * while (Date.now() - now < 500);
   *
   * console.log(cpuUsage(startUsage));
   * // { user: 514883, system: 11226 }
   * ```
   * @since v6.1.0
   * @param previousValue A previous return value from calling `process.cpuUsage()`
   */
  cpuUsage(previousValue?: NodeJS.CpuUsage): NodeJS.CpuUsage;
  /**
   * ```js
   * import { resourceUsage } from 'process';
   *
   * console.log(resourceUsage());
   * /*
   *   Will output:
   *   {
   *     userCPUTime: 82872,
   *     systemCPUTime: 4143,
   *     maxRSS: 33164,
   *     sharedMemorySize: 0,
   *     unsharedDataSize: 0,
   *     unsharedStackSize: 0,
   *     minorPageFault: 2469,
   *     majorPageFault: 0,
   *     swappedOut: 0,
   *     fsRead: 0,
   *     fsWrite: 8,
   *     ipcSent: 0,
   *     ipcReceived: 0,
   *     signalsCount: 0,
   *     voluntaryContextSwitches: 79,
   *     involuntaryContextSwitches: 1
   *   }
   *
   * ```
   * @since v12.6.0
   * @return the resource usage for the current process. All of these values come from the `uv_getrusage` call which returns a [`uv_rusage_t` struct][uv_rusage_t].
   */
  resourceUsage(): NodeJS.ResourceUsage;

  /**
   * A string representing the path to the resources directory.
   */
  resourcesPath: string

  /**
   * A string representing the current process's type
   */
  type: "browser" | "renderer" | "worker" | "utility" | "sandboxed-browser"

  /**
   * For Mac App Store build, this property is true, for other builds it is undefined.
   */
  mas?: boolean

  /**
   * When the renderer process is sandboxed, 
   * this property is true, otherwise it is undefined.
   */
  sandboxed: boolean

  /**
   * A boolean that indicates whether 
   * the current renderer context has contextIsolation enabled. 
   * It is undefined in the main process.
   */
  contextIsolated?: boolean

  /**
   * If the app is running as a Windows Store app (appx), 
   * this property is true, for otherwise it is undefined.
   */
  windowsStore?: boolean

  /**
   * A Electron.ParentPort property 
   * if this is a UtilityProcess (or null otherwise) 
   * allowing communication with the parent process.
   */
  parentPort?: ParentPort
}
