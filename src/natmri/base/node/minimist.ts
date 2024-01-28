// fork minimist https://github.com/minimistjs/minimist/blob/main/index.js

export interface Options {
  /**
   * A string or array of strings argument names to always treat as strings
   */
  string?: string | string[] | undefined

  /**
   * A boolean, string or array of strings to always treat as booleans. If true will treat
   * all double hyphenated arguments without equals signs as boolean (e.g. affects `--foo`, not `-f` or `--foo=bar`)
   */
  boolean?: boolean | string | string[] | undefined

  /**
   * An object mapping string names to strings or arrays of string argument names to use as aliases
   */
  alias?: { [key: string]: string | string[] } | undefined

  /**
   * An object mapping string argument names to default values
   */
  default?: { [key: string]: any } | undefined

  /**
   * When true, populate argv._ with everything after the first non-option
   */
  stopEarly?: boolean | undefined

  /**
   * A function which is invoked with a command line parameter not defined in the options
   * configuration object. If the function returns false, the unknown option is not added to argv
   */
  unknown?: ((arg: string) => boolean) | undefined

  /**
   * When true, populate argv._ with everything before the -- and argv['--'] with everything after the --.
   * Note that with -- set, parsing for arguments still stops after the `--`.
   */
  '--'?: boolean | undefined
}

interface ParsedArgs {
  [arg: string]: any

  /**
   * If options['--'] is true, populated with everything after the --
   */
  '--'?: string[] | undefined

  /**
   * Contains all the arguments that didn't have an option associated with them
   */
  _: string[]
}

function hasKey(obj: Record<string, any>, keys: string[]) {
  let o = obj
  keys.slice(0, -1).forEach((key) => {
    o = o[key] || {}
  })

  const key = keys[keys.length - 1]
  return key in o
}

function isNumber(x: any) {
  if (typeof x === 'number')
    return true
  if ((/^0x[0-9a-f]+$/i).test(x))
    return true
  return (/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(e[-+]?\d+)?$/).test(x)
}

function isConstructorOrProto(obj: Record<string, any>, key: string) {
  return (key === 'constructor' && typeof obj[key] === 'function') || key === '__proto__'
}

export function minimist(args: string[], options: Options = {}): ParsedArgs {
  const flags: Record<string, any> = {
    bools: {},
    strings: {},
    unknownFn: null,
  }

  if (typeof options.unknown === 'function')
    flags.unknownFn = options.unknown

  if (typeof options.boolean === 'boolean' && options.boolean) {
    flags.allBools = true
  }
  else {
    options.boolean ?? [].filter(Boolean).forEach((key) => {
      flags.bools[key] = true
    })
  }

  const aliases: Record<string, any[]> = {}

  function aliasIsBoolean(key: string) {
    return aliases[key].some((x) => {
      return flags.bools[x]
    })
  }

  Object.keys(options.alias || {}).forEach((key) => {
    aliases[key] = options!.alias![key]
    aliases[key].forEach((x): any => {
      aliases[x] = [key].concat(aliases[key].filter((y) => {
        return x !== y
      }))
    })
  })

  options.string ?? [].filter(Boolean).forEach((key) => {
    flags.strings[key] = true
    if (aliases[key]) {
      [].concat(aliases[key]).forEach((k) => {
        flags.strings[k] = true
      })
    }
  })

  const defaults = options.default || {}

  const argv: ParsedArgs = { _: [] }

  function argDefined(key, arg) {
    return (flags.allBools && (/^--[^=]+$/).test(arg))
      || flags.strings[key]
      || flags.bools[key]
      || aliases[key]
  }

  function setKey(obj, keys, value) {
    let o = obj
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (isConstructorOrProto(o, key))
        return
      if (o[key] === undefined)
        o[key] = {}
      if (
        o[key] === Object.prototype
        || o[key] === Number.prototype
        || o[key] === String.prototype
      )
        o[key] = {}

      if (o[key] === Array.prototype)
        o[key] = []
      o = o[key]
    }

    const lastKey = keys[keys.length - 1]
    if (isConstructorOrProto(o, lastKey))
      return
    if (
      o === Object.prototype
      || o === Number.prototype
      || o === String.prototype
    )
      o = {}

    if (o === Array.prototype)
      o = []
    if (o[lastKey] === undefined || flags.bools[lastKey] || typeof o[lastKey] === 'boolean')
      o[lastKey] = value

    else if (Array.isArray(o[lastKey]))
      o[lastKey].push(value)

    else
      o[lastKey] = [o[lastKey], value]
  }

  function setArg(key, val, arg?: any) {
    if (arg && flags.unknownFn && !argDefined(key, arg)) {
      if (flags.unknownFn(arg) === false)
        return
    }

    const value = (!flags.strings[key] && isNumber(val))
      ? Number(val)
      : val
    setKey(argv, key.split('.'), value);

    (aliases[key] || []).forEach((x) => {
      setKey(argv, x.split('.'), value)
    })
  }

  Object.keys(flags.bools).forEach((key) => {
    setArg(key, defaults[key] === undefined ? false : defaults[key])
  })

  let notFlags: string[] = []

  if (args.includes('--')) {
    notFlags = args.slice(args.indexOf('--') + 1)
    args = args.slice(0, args.indexOf('--'))
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    let key: string
    let next: string

    if ((/^--.+=/).test(arg)) {
      // Using [\s\S] instead of . because js doesn't support the
      // 'dotall' regex modifier. See:
      // http://stackoverflow.com/a/1068308/13216
      const m = arg.match(/^--([^=]+)=([\s\S]*)$/)
      if (!m)
        continue

      key = m[1]
      let value: any = m[2]
      if (flags.bools[key])
        value = value !== 'false'

      setArg(key, value, arg)
    }
    else if ((/^--no-.+/).test(arg)) {
      key = arg.match(/^--no-(.+)/)![1]
      setArg(key, false, arg)
    }
    else if ((/^--.+/).test(arg)) {
      key = arg.match(/^--(.+)/)![1]
      next = args[i + 1]
      if (
        next !== undefined
        && !(next).startsWith('-')
        && !flags.bools[key]
        && !flags.allBools
        && (aliases[key] ? !aliasIsBoolean(key) : true)
      ) {
        setArg(key, next, arg)
        i += 1
      }
      else if ((/^(true|false)$/).test(next)) {
        setArg(key, next === 'true', arg)
        i += 1
      }
      else {
        setArg(key, flags.strings[key] ? '' : true, arg)
      }
    }
    else if ((/^-[^-]+/).test(arg)) {
      const letters = arg.slice(1, -1).split('')

      let broken = false
      for (let j = 0; j < letters.length; j++) {
        next = arg.slice(j + 2)

        if (next === '-') {
          setArg(letters[j], next, arg)
          continue
        }

        if ((/[A-Za-z]/).test(letters[j]) && (/[=]/).test(next)) {
          setArg(letters[j], next.split('=')[1], arg)
          broken = true
          break
        }

        if (
          (/[A-Za-z]/).test(letters[j])
          && (/-?\d+(\.\d*)?(e-?\d+)?$/).test(next)
        ) {
          setArg(letters[j], next, arg)
          broken = true
          break
        }

        if (letters[j + 1] && letters[j + 1].match(/\W/)) {
          setArg(letters[j], arg.slice(j + 2), arg)
          broken = true
          break
        }
        else {
          setArg(letters[j], flags.strings[letters[j]] ? '' : true, arg)
        }
      }

      key = arg.slice(-1)[0]
      if (!broken && key !== '-') {
        if (
          args[i + 1]
          && !(/^(-|--)[^-]/).test(args[i + 1])
          && !flags.bools[key]
          && (aliases[key] ? !aliasIsBoolean(key) : true)
        ) {
          setArg(key, args[i + 1], arg)
          i += 1
        }
        else if (args[i + 1] && (/^(true|false)$/).test(args[i + 1])) {
          setArg(key, args[i + 1] === 'true', arg)
          i += 1
        }
        else {
          setArg(key, flags.strings[key] ? '' : true, arg)
        }
      }
    }
    else {
      if (!flags.unknownFn || flags.unknownFn(arg) !== false)
        argv._.push((flags.strings._ || !isNumber(arg)) ? arg : Number(arg) as any)

      if (options.stopEarly) {
        argv._.push(...args.slice(i + 1))
        break
      }
    }
  }

  Object.keys(defaults).forEach((k) => {
    if (!hasKey(argv, k.split('.'))) {
      setKey(argv, k.split('.'), defaults[k]);

      (aliases[k] || []).forEach((x) => {
        setKey(argv, x.split('.'), defaults[k])
      })
    }
  })

  if (options['--']) {
    argv['--'] = notFlags.slice()
  }
  else {
    notFlags.forEach((k) => {
      argv._.push(k)
    })
  }

  return argv
}
