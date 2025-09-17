import { effect, EffectRef, inject, signal, Signal, untracked, WritableSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';

/**
 * Represents a reactive binding to a query parameter.
 * Provides a Signal for observing the parameter as well as
 * helper methods for setting, updating, and clearing the value.
 */
export interface QueryParamSignal {
  /**
   * Reactive Signal containing the current value of the query parameter.
   * Emits `null` if the parameter is not present.
   */
  value: Signal<string | null>;

  /**
   * Sets the query parameter to a specific value.
   *
   * @param v - The new value to assign. Use `null` to remove the parameter.
   */
  set(v: string | null): void;

  /**
   * Removes the query parameter from the URL,
   * equivalent to calling `set(null)`.
   */
  clear(): void;

  /**
   * Updates the query parameter by applying a transformation function
   * to the previous value.
   *
   * @param fn - A callback that receives the previous value and returns
   *             the updated value. Returning `null` removes the parameter.
   */
  update(fn: (prev: string | null) => string | null): void;

  /**
   * Cleans up any effects or listeners created by the signal.
   * Should be called when the signal is no longer needed.
   */
  destroy(): void;
}

/**
 * Creates a new QueryParamSignal for synchronizing a query parameter
 * with Angular's reactive Signal system.
 *
 * @param key - The name of the query parameter to bind.
 * @param debug - Optional flag for enabling debug mode. Defaults to `false`.
 * @returns A QueryParamSignal instance bound to the given parameter.
 */
export function queryParamSignal(key: string, debug = false): QueryParamSignal {
  return new QueryParamSignalImpl(key, debug);
}

export class QueryParamSignalImpl implements QueryParamSignal {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly rawFromUrl: Signal<string | null>;
  private readonly state: WritableSignal<string | null>;
  private effectRefs: EffectRef[] = [];

  readonly value: Signal<string | null>;

  constructor(private readonly key: string, private readonly debug = false) {
    this.rawFromUrl = toSignal<string | null>(
      this.route.queryParamMap.pipe(
        map(p => p.get(this.key)),
        distinctUntilChanged()
      ),
      { initialValue: null }
    );

    const initialRaw = this.route.snapshot.queryParamMap.get(this.key) ?? null;
    const initial = decode(initialRaw);
    this.state = signal(initial);
    this.value = this.state;

    this.log('init', { key: this.key, initialRaw, initial });

    // keep state in sync with url
    this.effectRefs.push(
      effect(() => {
        const raw = this.rawFromUrl();
        const v = decode(raw);
        const prev = untracked(() => this.state());
        const changed = prev !== v;
        this.log('url → state effect', { raw, decoded: v, prev, changed });
        if (changed) this.state.set(v);
      })
    );

    // push state changes to url
    this.effectRefs.push(
      effect(() => {
        const next = this.state();
        const current = decode(untracked(() => this.rawFromUrl()));
        const same = next === current;
        this.log('state → url effect', { next, current, skip: same });
        if (same) return;

        const queryParams = { [this.key]: next ?? null };
        this.log('navigating', {
          queryParams,
          opts: { relativeTo: 'this.route', merge: true, replaceUrl: true }
        });

        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams,
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      })
    );
  }

  set(v: string | null): void {
    this.log('set()', { from: untracked(() => this.state()), to: v }); // untracked for logging
    this.state.set(v);
  }

  clear(): void {
    this.log('clear()', { from: untracked(() => this.state()), to: null });
    this.state.set(null);
  }

  update(updateFn: (prev: string | null) => string | null): void {
    this.log('update() start', { current: untracked(() => this.state()) });
    this.state.update(prev => {
      const next = updateFn(prev);
      this.log('update() applied', { prev, next });
      return next;
    });
  }

  destroy(): void {
    this.log('destroy()', { effects: this.effectRefs.length });
    for (const effectRef of this.effectRefs) {
      effectRef.destroy();
    }
    this.effectRefs = [];
  }

  private log(message: string, data?: unknown): void {
    if (!this.debug) return;
    console.log(`[QueryParamSignal:${this.key}] ${message}`, data ?? '');
  }
}

function decode(raw: string | null): string | null {
  return raw && raw !== 'null' ? raw : null;
}