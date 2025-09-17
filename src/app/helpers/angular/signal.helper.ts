import { Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { asyncScheduler, debounceTime, SchedulerLike, ThrottleConfig, throttleTime } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

export function debouncedSignal<T>(sourceSignal: Signal<T>, debounceTimeInMs = 0): Signal<T> {
  const source$ = toObservable(sourceSignal);
  const debounced$ = source$.pipe(debounceTime(debounceTimeInMs));
  return toSignal(debounced$, { initialValue: sourceSignal() });
}

export function throttleTimeSignal<T>(
  sourceSignal: Signal<T>,
  duration: number,
  scheduler: SchedulerLike = asyncScheduler,
  config?: ThrottleConfig,
): Signal<T> {
  const source$ = toObservable(sourceSignal);
  const debounced$ = source$.pipe(throttleTime(duration, scheduler, config));
  return toSignal(debounced$, { initialValue: sourceSignal() });
}

export function deepDistinctSignal<T>(sourceSignal: Signal<T>): Signal<T> {
  const source$ = toObservable(sourceSignal);

  const distinct$ = source$.pipe(
    map((value) => JSON.stringify(value)),
    distinctUntilChanged(),
    map((json) => JSON.parse(json) as T),
  );

  // Ensure initial value is a deep clone as well
  const initial = JSON.parse(JSON.stringify(sourceSignal())) as T;

  return toSignal(distinct$, { initialValue: initial });
}
