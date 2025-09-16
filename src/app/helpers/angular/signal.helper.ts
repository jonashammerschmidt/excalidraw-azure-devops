import { Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { asyncScheduler, debounceTime, SchedulerLike, ThrottleConfig, throttleTime } from 'rxjs';

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
