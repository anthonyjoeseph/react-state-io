/**
 * The `State` monad is a synonym for the `StateT` monad transformer, applied to the `Identity` monad.
 *
 * @since 2.0.0
 */
import { Monad2 } from 'fp-ts/lib/Monad';
import { getStateM } from 'fp-ts/lib/StateT';
import { task, Task } from 'fp-ts/lib/Task'
import { pipeable } from 'fp-ts/lib/pipeable';

const T = getStateM(task)

declare module 'fp-ts/lib/HKT' {
  interface URItoKind2<E, A> {
    readonly StateTask: StateTask<E, A>;
  }
}

/**
 * @since 2.0.0
 */
export const URI = 'StateTask'

/**
 * @since 2.0.0
 */
export type URI = typeof URI

/* tslint:disable:readonly-array */
/**
 * @since 2.0.0
 */
export interface StateTask<S, A> {
  (s: S): Task<[A, S]>;
}
/* tslint:enable:readonly-array */

/**
 * Run a computation in the `State` monad, discarding the final state
 *
 * @since 2.0.0
 */
export const evalState: <S, A>(ma: StateTask<S, A>, s: S) => Task<A> = T.evalState

/**
 * Run a computation in the `State` monad discarding the result
 *
 * @since 2.0.0
 */
export const execState: <S, A>(ma: StateTask<S, A>, s: S) => Task<S> = T.execState

/**
 * Get the current state
 *
 * @since 2.0.0
 */
export const get: <S>() => StateTask<S, S> = T.get

/**
 * Set the state
 *
 * @since 2.0.0
 */
export const put: <S>(s: S) => StateTask<S, void> = T.put

/**
 * Modify the state by applying a function to the current state
 *
 * @since 2.0.0
 */
export const modify: <S>(f: (s: S) => S) => StateTask<S, void> = T.modify

/**
 * Get a value which depends on the current state
 *
 * @since 2.0.0
 */
export const gets: <S, A>(f: (s: S) => A) => StateTask<S, A> = T.gets

/**
 * @since 2.0.0
 */
export const of: <S, A>(a: A) => StateTask<S, A> = T.of

/**
 * @since 2.0.0
 */
export const stateTask: Monad2<URI> = {
  URI,
  map: T.map,
  of,
  ap: T.ap,
  chain: T.chain
}

const { ap, apFirst, apSecond, chain, chainFirst, flatten, map } = pipeable(stateTask)

export {
  /**
   * @since 2.0.0
   */
  ap,
  /**
   * @since 2.0.0
   */
  apFirst,
  /**
   * @since 2.0.0
   */
  apSecond,
  /**
   * @since 2.0.0
   */
  chain,
  /**
   * @since 2.0.0
   */
  chainFirst,
  /**
   * @since 2.0.0
   */
  flatten,
  /**
   * @since 2.0.0
   */
  map
}