import React, { Component } from 'react';
import * as T from 'fp-ts/lib/Task';
import * as O from 'fp-ts/lib/Option';
import * as E from 'fp-ts/lib/Eq';
import { pipe } from 'fp-ts/lib/pipeable';
import { sequenceT } from 'fp-ts/lib/Apply';
import { flow } from 'fp-ts/lib/function';
import { StateTask } from './util/StateTask';
import { State } from 'fp-ts/lib/State';

interface AppStateProps<S, P> {
  appState: S;
  useSideEffect: (s: {
    appState?: Pick<S, keyof S>;
    param?: P;
  }) => void;
}

export type SideEffect<S, P> = (p: P) => StateTask<() => S, O.Option<P>> 

export interface SyncCallbackRegistrar<
S, P,
A extends ReadonlyArray<unknown> = unknown[],
B = void
> {
  registerCallback: (callback: (...c: A) => B | void) => void;
  callbackWithStateToState?: (...c: A) => State<() => S, O.Option<P>>;
  stateToRetVal?: (currentStateThunk:  () => S, ...c: A) => B;
}

export interface AsyncCallbackRegistrar<
S, P,
A extends ReadonlyArray<unknown> = unknown[],
B = unknown
> {
  registerCallback: (callback: (...c: A) => Promise<B> | void) => void;
  callbackWithStateToAsyncState?: (...c: A) => StateTask<() => S, O.Option<P>>;
  stateToRetVal?: (currentStateThunk:  () => S) => Promise<B>;
}

/**
 * Creates a root component with global state
 * Side effects can be invoked globally with the a
 * 
 * @template S - Global app state type
 * @template P - Parameterizes the Async Side Effect Handler 
 * @param Root - The app's root component
 * @param defaultState - Populates app's global state before component is mounted
 * @param asyncSideEffectHandler - Effectfully transforms global state using parameter P. Provides a single location where side effects may be directly invoked.
 * @param syncCallbackRegistrar - Allows a synchronous effectful callback to transform global state
 * @param asyncCallbackRegistrar - Allows an asynchronous effectful callback to transform global state
 * @param onMount - An effectful callback that transforms global state. Invoked when the component is initially mounted
 */
export default function withStateIO<S, P>(
  Root: React.ComponentType<AppStateProps<S, P>>,
  defaultState: S,
  stateEq: E.Eq<S>,
  withSideEffects: {
    asyncSideEffectHandler?: (s: () => S, p: P) => T.Task<S>;
    syncCallbackRegistrar?: SyncCallbackRegistrar<S, P>[];
    asyncCallbackRegistrar?: AsyncCallbackRegistrar<S, P>[];
    onMount?: StateTask<() => S, O.Option<P>>;
  }
): React.ComponentType<{}>{
  const {
    asyncSideEffectHandler, syncCallbackRegistrar,
    asyncCallbackRegistrar, onMount,
  } = withSideEffects;
  return class RootWithCallbacks extends Component<{}, S>{
    
    public state = defaultState;

    private useSideEffect = (
      newState: S,
      param: O.Option<P>,
    ): T.Task<S> => pipe(
      sequenceT(O.option)(
        param,
        O.fromNullable(asyncSideEffectHandler),
      ),
      O.map(([someParam, someHandler]) => pipe(
        someHandler(
          () => ({
            ...this.state,
            ...newState,
          }),
          someParam,
        ),
        T.map(newHandlerState => ({
          ...this.state,
          newState,
          newHandlerState,
        })),
      )),
      O.getOrElse(() => T.of(newState)),
    );

    private setStateAsync = (
      newStateTask: T.Task<S>
    ): T.Task<void> => pipe(
      newStateTask,
      T.map(newState => {
        if (!stateEq.equals(newState, this.state)) {
          this.setState(newState);
        }
      }),
    );

    public componentDidMount(): void {
      syncCallbackRegistrar?.forEach(({
        registerCallback,
        callbackWithStateToState,
        stateToRetVal,
      }) => {
        registerCallback((...c) => {
          const newState = pipe(
            O.fromNullable(callbackWithStateToState),
            O.map((callback): S => {
              const [param, newState] = callback(c)(() => this.state);
              const runSetState = flow(
                this.useSideEffect,
                this.setStateAsync,
                (runTask) => runTask(),
              )
              runSetState(newState(), param);
              return newState();
            }),
            O.getOrElse<S>(() => this.state),
          );
          if (!stateToRetVal) return undefined;
          return stateToRetVal(() => ({
            ...this.state,
            ...newState,
          }), ...c);
        });
      });
      asyncCallbackRegistrar?.forEach(({
        registerCallback,
        callbackWithStateToAsyncState,
        stateToRetVal,
      }) => {
        registerCallback((...c) => {
          const runCallback = pipe(
            callbackWithStateToAsyncState
            ? pipe(
              callbackWithStateToAsyncState(...c)(() => this.state),
              T.chain(([param, newState]) => pipe(
                this.useSideEffect(
                  newState(), param,
                ),
                this.setStateAsync,
                T.map(() => newState),
              ))
            )
            : T.of(() => this.state),
            T.map((newState) => {
              if (stateToRetVal) {
                return (): Promise<unknown> => stateToRetVal(() => ({
                  ...this.state,
                  ...newState,
                }));
              }
              return T.of(undefined);
            })
          );
          return runCallback();
        });
      });
      if (onMount) {
        const runMount = pipe(
          onMount(() => this.state),
          T.chain(([param, newState]) => pipe(
            this.useSideEffect(
              newState(), param,
            ),
            this.setStateAsync,
            T.map(() => newState),
          )),
        );
        runMount();
      }
    }

    render(): JSX.Element {
      return (
        <Root
          appState={this.state}
          useSideEffect={flow(
            ({ appState, param }: {
              appState?: S;
              param?: P;
            }) => this.useSideEffect(
              appState || this.state,
              O.fromNullable(param),
            ),
            this.setStateAsync,
            (runTask) => runTask(),
          )}
        />
      );
    }
  };
}

