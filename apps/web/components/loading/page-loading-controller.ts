export type LoadingPhase = 'idle' | 'loading' | 'complete' | 'aborted';
type Snapshot = { id: number; phase: LoadingPhase };

export class PageLoadingController {
  private snapshot: Snapshot = { id: 0, phase: 'idle' };
  private listeners = new Set<() => void>();
  private blockers = new Map<symbol, string>();
  private source = '';
  private target: string | null = null;
  private committed: string | null = null;
  private settled = false;
  private local = false;

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private emit(phase: LoadingPhase, id = this.snapshot.id) {
    this.snapshot = { id, phase };
    this.listeners.forEach((listener) => listener());
  }

  begin(source: string, target: string | null) {
    this.source = source;
    this.target = target;
    this.committed = null;
    this.settled = false;
    this.local = false;
    this.emit('loading', this.snapshot.id + 1);
    return this.snapshot.id;
  }

  commit(id: number, route: string) {
    if (id !== this.snapshot.id || this.snapshot.phase !== 'loading') return;
    if (route === this.source && this.target !== this.source) return;
    this.committed = route;
    this.check(id);
  }

  transitionSettled(id: number) {
    if (id !== this.snapshot.id) return;
    this.settled = true;
    this.check(id);
  }

  block(route: string) {
    if (this.snapshot.phase !== 'loading' || (this.local && route !== this.target)) {
      this.begin(route, route);
      this.local = true;
      this.committed = route;
    }
    const key = Symbol();
    const id = this.snapshot.id;
    this.blockers.set(key, route);
    return () => {
      this.blockers.delete(key);
      this.commit(id, route);
      this.check(this.snapshot.id);
    };
  }

  private check(id: number) {
    // Layout effects register all destination blockers before this runs.
    queueMicrotask(() => {
      if (id !== this.snapshot.id || this.snapshot.phase !== 'loading') return;
      const route = this.committed;
      if (!route || (route !== this.target && !this.settled && this.target !== null)) return;
      if ([...this.blockers.values()].includes(route)) return;
      this.emit('complete');
    });
  }

  abort(id: number) {
    if (id === this.snapshot.id && this.snapshot.phase === 'loading') this.emit('aborted');
  }

  reset(id: number) {
    if (id === this.snapshot.id && this.snapshot.phase !== 'loading') this.emit('idle');
  }
}
