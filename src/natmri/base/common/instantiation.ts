/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *-------------------------------------------------------------------------------------------- */

import { IdleValue } from 'natmri/base/common/async'
import { illegalState } from 'natmri/base/common/errors'
import { toDisposable } from 'natmri/base/common/lifecycle'
import { LinkedList } from 'natmri/base/common/linkedList'
import type { Event } from 'natmri/base/common/event'

export class SyncDescriptor<T> {
  readonly ctor: any
  readonly staticArguments: any[]
  readonly supportsDelayedInstantiation: boolean

  constructor(ctor: new (...args: any[]) => T, staticArguments: any[] = [], supportsDelayedInstantiation = false) {
    this.ctor = ctor
    this.staticArguments = staticArguments
    this.supportsDelayedInstantiation = supportsDelayedInstantiation
  }
}

export interface SyncDescriptor0<T> {
  readonly ctor: new () => T
}

class Node<T> {
  readonly incoming = new Map<string, Node<T>>()
  readonly outgoing = new Map<string, Node<T>>()

  constructor(
    readonly key: string,
    readonly data: T,
  ) { }
}

class Graph<T> {
  private readonly _nodes = new Map<string, Node<T>>()

  constructor(private readonly _hashFn: (element: T) => string) {
    // empty
  }

  roots(): Node<T>[] {
    const ret: Node<T>[] = []
    for (const node of this._nodes.values()) {
      if (node.outgoing.size === 0)
        ret.push(node)
    }
    return ret
  }

  insertEdge(from: T, to: T): void {
    const fromNode = this.lookupOrInsertNode(from)
    const toNode = this.lookupOrInsertNode(to)

    fromNode.outgoing.set(toNode.key, toNode)
    toNode.incoming.set(fromNode.key, fromNode)
  }

  removeNode(data: T): void {
    const key = this._hashFn(data)
    this._nodes.delete(key)
    for (const node of this._nodes.values()) {
      node.outgoing.delete(key)
      node.incoming.delete(key)
    }
  }

  lookupOrInsertNode(data: T): Node<T> {
    const key = this._hashFn(data)
    let node = this._nodes.get(key)

    if (!node) {
      node = new Node(key, data)
      this._nodes.set(key, node)
    }

    return node
  }

  lookup(data: T): Node<T> | undefined {
    return this._nodes.get(this._hashFn(data))
  }

  isEmpty(): boolean {
    return this._nodes.size === 0
  }

  toString(): string {
    const data: string[] = []
    for (const [key, value] of this._nodes)
      data.push(`${key}\n\t(-> incoming)[${[...value.incoming.keys()].join(', ')}]\n\t(outgoing ->)[${[...value.outgoing.keys()].join(',')}]\n`)

    return data.join('\n')
  }

  /**
   * This is brute force and slow and **only** be used
   * to trouble shoot.
   */
  findCycleSlow() {
    for (const [id, node] of this._nodes) {
      const seen = new Set<string>([id])
      const res = this._findCycle(node, seen)
      if (res)
        return res
    }
    return undefined
  }

  private _findCycle(node: Node<T>, seen: Set<string>): string | undefined {
    for (const [id, outgoing] of node.outgoing) {
      if (seen.has(id))
        return [...seen, id].join(' -> ')

      seen.add(id)
      const value = this._findCycle(outgoing, seen)
      if (value)
        return value

      seen.delete(id)
    }
    return undefined
  }
}

export class ServiceCollection {
  private _entries = new Map<ServiceIdentifier<any>, any>()

  constructor(...entries: [ServiceIdentifier<any>, any][]) {
    for (const [id, service] of entries)
      this.set(id, service)
  }

  set<T>(id: ServiceIdentifier<T>, instanceOrDescriptor: T | SyncDescriptor<T>): T | SyncDescriptor<T> {
    const result = this._entries.get(id)
    this._entries.set(id, instanceOrDescriptor)
    return result
  }

  has(id: ServiceIdentifier<any>): boolean {
    return this._entries.has(id)
  }

  get<T>(id: ServiceIdentifier<T>): T | SyncDescriptor<T> {
    return this._entries.get(id)
  }
}

export namespace _util {

  export const serviceIds = new Map<string, ServiceIdentifier<any>>()

  export const DI_TARGET = '$di$target'
  export const DI_DEPENDENCIES = '$di$dependencies'

  export function getServiceDependencies(ctor: any): { id: ServiceIdentifier<any>, index: number }[] {
    return ctor[DI_DEPENDENCIES] || []
  }
}

// --- interfaces ------

export interface BrandedService { _serviceBrand: undefined }

export interface IConstructorSignature<T, Args extends any[] = []> {
  new<Services extends BrandedService[]>(...args: [...Args, ...Services]): T
}

export interface ServicesAccessor {
  get<T>(id: ServiceIdentifier<T>): T
}

export const IInstantiationService = createDecorator<IInstantiationService>('instantiationService')

/**
 * Given a list of arguments as a tuple, attempt to extract the leading, non-service arguments
 * to their own tuple.
 */
export type GetLeadingNonServiceArgs<Args> =
  Args extends [...BrandedService[]] ? []
    : Args extends [infer A, ...BrandedService[]] ? [A]
      : Args extends [infer A, ...infer R] ? [A, ...GetLeadingNonServiceArgs<R>]
        : never

export interface IInstantiationService {

  readonly _serviceBrand: undefined

  /**
   * Synchronously creates an instance that is denoted by the descriptor
   */
  createInstance<T>(descriptor: SyncDescriptor0<T>): T
  createInstance<Ctor extends new (...args: any[]) => any, R extends InstanceType<Ctor>>(ctor: Ctor, ...args: GetLeadingNonServiceArgs<ConstructorParameters<Ctor>>): R

  /**
   * Calls a function with a service accessor.
   */
  invokeFunction<R, TS extends any[] = []>(fn: (accessor: ServicesAccessor, ...args: TS) => R, ...args: TS): R

  /**
   * Creates a child of this service which inherits all current services
   * and adds/overwrites the given services.
   */
  createChild(services: ServiceCollection): IInstantiationService
}

/**
 * Identifies a service of type `T`.
 */
export interface ServiceIdentifier<T> {
  (...args: any[]): void
  type: T
}

function storeServiceDependency(id: Function, target: Function, index: number): void {
  if ((target as any)[_util.DI_TARGET] === target) {
    (target as any)[_util.DI_DEPENDENCIES].push({ id, index })
  }
  else {
    (target as any)[_util.DI_DEPENDENCIES] = [{ id, index }];
    (target as any)[_util.DI_TARGET] = target
  }
}

/**
 * The *only* valid way to create a {{ServiceIdentifier}}.
 */
export function createDecorator<T>(serviceId: string): ServiceIdentifier<T> {
  if (_util.serviceIds.has(serviceId))
    return _util.serviceIds.get(serviceId)!

  const id = <any> function (target: Function, key: string, index: number): any {
    if (arguments.length !== 3)
      throw new Error('@IServiceName-decorator can only be used to decorate a parameter')

    storeServiceDependency(id, target, index)
  }

  id.toString = () => serviceId

  _util.serviceIds.set(serviceId, id)
  return id
}

export function refineServiceDecorator<T1, T extends T1>(serviceIdentifier: ServiceIdentifier<T1>): ServiceIdentifier<T> {
  return <ServiceIdentifier<T>>serviceIdentifier
}

// TRACING
const _enableAllTracing = false
// || "TRUE" // DO NOT CHECK IN!

class CyclicDependencyError extends Error {
  constructor(graph: Graph<any>) {
    super('cyclic dependency between services')
    this.message = graph.findCycleSlow() ?? `UNABLE to detect cycle, dumping graph: \n${graph.toString()}`
  }
}

export class InstantiationService implements IInstantiationService {
  declare readonly _serviceBrand: undefined

  readonly _globalGraph?: Graph<string>
  private _globalGraphImplicitDependency?: string

  constructor(
    private readonly _services: ServiceCollection = new ServiceCollection(),
    private readonly _strict: boolean = false,
    private readonly _parent?: InstantiationService,
    private readonly _enableTracing: boolean = _enableAllTracing,
  ) {
    this._services.set(IInstantiationService, this)
    this._globalGraph = _enableTracing ? _parent?._globalGraph ?? new Graph(e => e) : undefined
  }

  createChild(services: ServiceCollection): IInstantiationService {
    return new InstantiationService(services, this._strict, this, this._enableTracing)
  }

  invokeFunction<R, TS extends any[] = []>(fn: (accessor: ServicesAccessor, ...args: TS) => R, ...args: TS): R {
    const _trace = Trace.traceInvocation(this._enableTracing, fn)
    let _done = false
    try {
      const accessor: ServicesAccessor = {
        get: <T>(id: ServiceIdentifier<T>) => {
          if (_done)
            throw illegalState('service accessor is only valid during the invocation of its target method')

          const result = this._getOrCreateServiceInstance(id, _trace)
          if (!result)
            throw new Error(`[invokeFunction] unknown service '${id}'`)

          return result
        },
      }
      return fn(accessor, ...args)
    }
    finally {
      _done = true
      _trace.stop()
    }
  }

  createInstance<T>(descriptor: SyncDescriptor0<T>): T
  createInstance<Ctor extends new (...args: any[]) => any, R extends InstanceType<Ctor>>(ctor: Ctor, ...args: GetLeadingNonServiceArgs<ConstructorParameters<Ctor>>): R
  createInstance(ctorOrDescriptor: any | SyncDescriptor<any>, ...rest: any[]): any {
    let _trace: Trace
    let result: any
    if (ctorOrDescriptor instanceof SyncDescriptor) {
      _trace = Trace.traceCreation(this._enableTracing, ctorOrDescriptor.ctor)
      result = this._createInstance(ctorOrDescriptor.ctor, ctorOrDescriptor.staticArguments.concat(rest), _trace)
    }
    else {
      _trace = Trace.traceCreation(this._enableTracing, ctorOrDescriptor)
      result = this._createInstance(ctorOrDescriptor, rest, _trace)
    }
    _trace.stop()
    return result
  }

  private _createInstance<T>(ctor: any, args: any[] = [], _trace: Trace): T {
    // arguments defined by service decorators
    const serviceDependencies = _util.getServiceDependencies(ctor).sort((a, b) => a.index - b.index)
    const serviceArgs: any[] = []
    for (const dependency of serviceDependencies) {
      const service = this._getOrCreateServiceInstance(dependency.id, _trace)
      if (!service)
        this._throwIfStrict(`[createInstance] ${ctor.name} depends on UNKNOWN service ${dependency.id}.`, false)

      serviceArgs.push(service)
    }

    const firstServiceArgPos = serviceDependencies.length > 0 ? serviceDependencies[0].index : args.length

    // check for argument mismatches, adjust static args if needed
    if (args.length !== firstServiceArgPos) {
      console.trace(`[createInstance] First service dependency of ${ctor.name} at position ${firstServiceArgPos + 1} conflicts with ${args.length} static arguments`)

      const delta = firstServiceArgPos - args.length
      if (delta > 0)
        args = args.concat(Array.from({ length: delta }))

      else
        args = args.slice(0, firstServiceArgPos)
    }

    // now create the instance
    return Reflect.construct<any, T>(ctor, args.concat(serviceArgs))
  }

  private _setServiceInstance<T>(id: ServiceIdentifier<T>, instance: T): void {
    if (this._services.get(id) instanceof SyncDescriptor)
      this._services.set(id, instance)

    else if (this._parent)
      this._parent._setServiceInstance(id, instance)

    else
      throw new Error('illegalState - setting UNKNOWN service instance')
  }

  private _getServiceInstanceOrDescriptor<T>(id: ServiceIdentifier<T>): T | SyncDescriptor<T> {
    const instanceOrDesc = this._services.get(id)
    if (!instanceOrDesc && this._parent)
      return this._parent._getServiceInstanceOrDescriptor(id)

    else
      return instanceOrDesc
  }

  protected _getOrCreateServiceInstance<T>(id: ServiceIdentifier<T>, _trace: Trace): T {
    if (this._globalGraph && this._globalGraphImplicitDependency)
      this._globalGraph.insertEdge(this._globalGraphImplicitDependency, String(id))

    const thing = this._getServiceInstanceOrDescriptor(id)
    if (thing instanceof SyncDescriptor) {
      return this._safeCreateAndCacheServiceInstance(id, thing, _trace.branch(id, true))
    }
    else {
      _trace.branch(id, false)
      return thing
    }
  }

  private readonly _activeInstantiations = new Set<ServiceIdentifier<any>>()

  private _safeCreateAndCacheServiceInstance<T>(id: ServiceIdentifier<T>, desc: SyncDescriptor<T>, _trace: Trace): T {
    if (this._activeInstantiations.has(id))
      throw new Error(`illegal state - RECURSIVELY instantiating service '${id}'`)

    this._activeInstantiations.add(id)
    try {
      return this._createAndCacheServiceInstance(id, desc, _trace)
    }
    finally {
      this._activeInstantiations.delete(id)
    }
  }

  private _createAndCacheServiceInstance<T>(id: ServiceIdentifier<T>, desc: SyncDescriptor<T>, _trace: Trace): T {
    interface Triple { id: ServiceIdentifier<any>, desc: SyncDescriptor<any>, _trace: Trace }
    const graph = new Graph<Triple>(data => data.id.toString())

    let cycleCount = 0
    const stack = [{ id, desc, _trace }]
    while (stack.length) {
      const item = stack.pop()!
      graph.lookupOrInsertNode(item)

      // a weak but working heuristic for cycle checks
      if (cycleCount++ > 1000)
        throw new CyclicDependencyError(graph)

      // check all dependencies for existence and if they need to be created first
      for (const dependency of _util.getServiceDependencies(item.desc.ctor)) {
        const instanceOrDesc = this._getServiceInstanceOrDescriptor(dependency.id)
        if (!instanceOrDesc)
          this._throwIfStrict(`[createInstance] ${id} depends on ${dependency.id} which is NOT registered.`, true)

        // take note of all service dependencies
        this._globalGraph?.insertEdge(String(item.id), String(dependency.id))

        if (instanceOrDesc instanceof SyncDescriptor) {
          const d = { id: dependency.id, desc: instanceOrDesc, _trace: item._trace.branch(dependency.id, true) }
          graph.insertEdge(item, d)
          stack.push(d)
        }
      }
    }

    while (true) {
      const roots = graph.roots()

      // if there is no more roots but still
      // nodes in the graph we have a cycle
      if (roots.length === 0) {
        if (!graph.isEmpty())
          throw new CyclicDependencyError(graph)

        break
      }

      for (const { data } of roots) {
        // Repeat the check for this still being a service sync descriptor. That's because
        // instantiating a dependency might have side-effect and recursively trigger instantiation
        // so that some dependencies are now fullfilled already.
        const instanceOrDesc = this._getServiceInstanceOrDescriptor(data.id)
        if (instanceOrDesc instanceof SyncDescriptor) {
          // create instance and overwrite the service collections
          const instance = this._createServiceInstanceWithOwner(data.id, data.desc.ctor, data.desc.staticArguments, data.desc.supportsDelayedInstantiation, data._trace)
          this._setServiceInstance(data.id, instance)
        }
        graph.removeNode(data)
      }
    }
    return <T> this._getServiceInstanceOrDescriptor(id)
  }

  private _createServiceInstanceWithOwner<T>(id: ServiceIdentifier<T>, ctor: any, args: any[] = [], supportsDelayedInstantiation: boolean, _trace: Trace): T {
    if (this._services.get(id) instanceof SyncDescriptor)
      return this._createServiceInstance(id, ctor, args, supportsDelayedInstantiation, _trace)

    else if (this._parent)
      return this._parent._createServiceInstanceWithOwner(id, ctor, args, supportsDelayedInstantiation, _trace)

    else
      throw new Error(`illegalState - creating UNKNOWN service instance ${ctor.name}`)
  }

  private _createServiceInstance<T>(id: ServiceIdentifier<T>, ctor: any, args: any[] = [], supportsDelayedInstantiation: boolean, _trace: Trace): T {
    if (!supportsDelayedInstantiation) {
      // eager instantiation
      return this._createInstance(ctor, args, _trace)
    }
    else {
      const child = new InstantiationService(undefined, this._strict, this, this._enableTracing)
      child._globalGraphImplicitDependency = String(id)

      // Return a proxy object that's backed by an idle value. That
      // strategy is to instantiate services in our idle time or when actually
      // needed but not when injected into a consumer

      // return "empty events" when the service isn't instantiated yet
      const earlyListeners = new Map<string, LinkedList<Parameters<Event<any>>>>()

      const idle = new IdleValue<any>(() => {
        const result = child._createInstance<T>(ctor, args, _trace)

        // early listeners that we kept are now being subscribed to
        // the real service
        for (const [key, values] of earlyListeners) {
          const candidate = <Event<any>>(<any>result)[key]
          if (typeof candidate === 'function') {
            for (const listener of values)
              candidate.apply(result, listener)
          }
        }
        earlyListeners.clear()

        return result
      })
      return <T> new Proxy(Object.create(null), {
        get(target: any, key: PropertyKey): any {
          if (!idle.isInitialized) {
            // looks like an event
            if (typeof key === 'string' && (key.startsWith('onDid') || key.startsWith('onWill'))) {
              let list = earlyListeners.get(key)
              if (!list) {
                list = new LinkedList()
                earlyListeners.set(key, list)
              }
              const event: Event<any> = (callback, thisArg, disposables) => {
                const rm = list!.push([callback, thisArg, disposables])
                return toDisposable(rm)
              }
              return event
            }
          }

          // value already exists
          if (key in target)
            return target[key]

          // create value
          const obj = idle.value
          let prop = obj[key]
          if (typeof prop !== 'function')
            return prop

          prop = prop.bind(obj)
          target[key] = prop
          return prop
        },
        set(_target: T, p: PropertyKey, value: any): boolean {
          idle.value[p] = value
          return true
        },
        getPrototypeOf(_target: T) {
          return ctor.prototype
        },
      })
    }
  }

  private _throwIfStrict(msg: string, printWarning: boolean): void {
    if (printWarning)
      console.warn(msg)

    if (this._strict)
      throw new Error(msg)
  }
}

// #region -- tracing ---

enum TraceType {
  None = 0,
  Creation = 1,
  Invocation = 2,
  Branch = 3,
}

export class Trace {
  static all = new Set<string>()

  private static readonly _None = new class extends Trace {
    constructor() { super(TraceType.None, null) }
    override stop() { }
    override branch() { return this }
  }()

  static traceInvocation(_enableTracing: boolean, ctor: any): Trace {
    return !_enableTracing ? Trace._None : new Trace(TraceType.Invocation, ctor.name || new Error('trace').stack!.split('\n').slice(3, 4).join('\n'))
  }

  static traceCreation(_enableTracing: boolean, ctor: any): Trace {
    return !_enableTracing ? Trace._None : new Trace(TraceType.Creation, ctor.name)
  }

  private static _totals = 0
  private readonly _start: number = Date.now()
  private readonly _dep: [ServiceIdentifier<any>, boolean, Trace?][] = []

  private constructor(
    readonly type: TraceType,
    readonly name: string | null,
  ) { }

  branch(id: ServiceIdentifier<any>, first: boolean): Trace {
    const child = new Trace(TraceType.Branch, id.toString())
    this._dep.push([id, first, child])
    return child
  }

  stop() {
    const dur = Date.now() - this._start
    Trace._totals += dur

    let causedCreation = false

    function printChild(n: number, trace: Trace) {
      const res: string[] = []
      const prefix = Array.from({ length: n + 1 }).join('\t')
      for (const [id, first, child] of trace._dep) {
        if (first && child) {
          causedCreation = true
          res.push(`${prefix}CREATES -> ${id}`)
          const nested = printChild(n + 1, child)
          if (nested)
            res.push(nested)
        }
        else {
          res.push(`${prefix}uses -> ${id}`)
        }
      }
      return res.join('\n')
    }

    const lines = [
      `${this.type === TraceType.Creation ? 'CREATE' : 'CALL'} ${this.name}`,
      `${printChild(1, this)}`,
      `DONE, took ${dur.toFixed(2)}ms (grand total ${Trace._totals.toFixed(2)}ms)`,
    ]

    if (dur > 2 || causedCreation)
      Trace.all.add(lines.join('\n'))
  }
}

// #endregion
