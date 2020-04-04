// 
// 
/**
 * Copied from Guilio Canti's fp-ts-routing
 * {@link https://github.com/gcanti/fp-ts-routing/blob/master/src/index.ts }
 */
/**
 * @since 0.4.0
 */
import { Option, some, option, isNone, none } from "fp-ts/lib/Option"
import { tuple } from "fp-ts/lib/function"
import { Monoid } from "fp-ts/lib/Monoid"
import { Monad2 } from "fp-ts/lib/Monad"
import { Alternative2 } from "fp-ts/lib/Alternative"
import { pipeable } from "fp-ts/lib/pipeable"

const PARSER2_URI = 'react-io/Parser2'

type PARSER2_URI = typeof PARSER2_URI

declare module 'fp-ts/lib/HKT' {
  interface URItoKind2<E, A> {
    [PARSER2_URI]: Parser2<E, A>;
  }
}

const assign = <A>(a: A) => <B>(b: B): A & B => Object.assign({}, a, b)

export type RowLacks<O, K extends string | number | symbol> = O & Record<Extract<keyof O, K>, never>

/**
 * @since 0.4.0
 */
export class Parser2<E, A> {
  readonly _A!: A
  constructor(readonly run: (r: E) => Option<[A, E]>) {}
  /**
   * @since 0.4.0
   */
  static of<Q, Z>(a: Z): Parser2<Q, Z> {
    return new Parser2(s => some(tuple(a, s)))
  }
  /**
   * @since 0.4.0
   */
  map<B>(f: (a: A) => B): Parser2<E, B> {
    return this.chain(a => Parser2.of(f(a))) // <= derived
  }
  /**
   * @since 0.4.0
   */
  ap<B>(fab: Parser2<E, (a: A) => B>): Parser2<E, B> {
    return fab.chain(f => this.map(f)) // <= derived
  }
  /**
   * @since 0.4.0
   */
  chain<B>(f: (a: A) => Parser2<E, B>): Parser2<E, B> {
    return new Parser2(r => option.chain(this.run(r), ([a, r2]) => f(a).run(r2)))
  }
  /**
   * @since 0.4.0
   */
  alt(that: Parser2<E, A>): Parser2<E, A> {
    return new Parser2(r => {
      const oar = this.run(r)
      return isNone(oar) ? that.run(r) : oar
    })
  }
  /**
   * @since 0.4.0
   */
  then<B>(that: Parser2<E, RowLacks<B, keyof A>>): Parser2<E, A & B> {
    return that.ap(this.map(assign as (a: A) => (b: B) => A & B))
  }
}

/**
 * @since 0.4.0
 */
export function zero<E, A>(): Parser2<E, A> {
  return new Parser2(() => none)
}

/**
 * @since 0.4.0
 */
export function parse<E, A>(parser2: Parser2<E, A>, r: E, a: A): A {
  const oa = option.map(parser2.run(r), ([a]) => a)
  return isNone(oa) ? a : oa.value
}


/**
 * @since 0.5.1
 */
export const getParser2Monoid2 = <A, O>(): Monoid<Parser2<A, O>> => ({
  concat: (x, y) => x.alt(y),
  empty: zero<A, O>()
})

/**
 * @since 0.5.1
 */
export const parser2: Monad2<PARSER2_URI> & Alternative2<PARSER2_URI> = {
  URI: PARSER2_URI,
  map: (ma, f) => ma.map(f),
  of: Parser2.of,
  ap: (mab, ma) => ma.ap(mab),
  chain: (ma, f) => ma.chain(f),
  alt: (fx, f) =>
    new Parser2(r => {
      const oar = fx.run(r)
      return isNone(oar) ? f().run(r) : oar
    }),
  zero
}

const { alt, ap, apFirst, apSecond, chain, chainFirst, flatten, map } = pipeable(parser2)

export {
  /**
   * @since 0.5.1
   */
  alt,
  /**
   * @since 0.5.1
   */
  ap,
  /**
   * @since 0.5.1
   */
  apFirst,
  /**
   * @since 0.5.1
   */
  apSecond,
  /**
   * @since 0.5.1
   */
  chain,
  /**
   * @since 0.5.1
   */
  chainFirst,
  /**
   * @since 0.5.1
   */
  flatten,
  /**
   * @since 0.5.1
   */
  map
}
