import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AdminActionRequest, AdminJob, AdminActionType, LocalClient, LocalClientInput } from '../models/admin';
import { NotificationService } from './notification.service';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AdminOpsService {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private jobs$ = new BehaviorSubject<AdminJob[]>([]);
  private clients$ = new BehaviorSubject<LocalClient[]>([]);

  getJobs(): Observable<AdminJob[]> {
    return this.jobs$.asObservable();
  }

  getClients(): Observable<LocalClient[]> {
    return this.clients$.asObservable();
  }

  refreshState(): Observable<void> {
    return forkJoin({
      jobs: this.api.get<{ jobs: AdminJob[] }>('/admin/jobs'),
      clients: this.api.get<{ clients: LocalClient[] }>('/admin/clients')
    }).pipe(
      tap(({ jobs, clients }) => {
        this.jobs$.next(jobs.jobs);
        this.clients$.next(clients.clients);
      }),
      catchError(error => {
        this.notifications.error('Impossible de charger les données admin');
        return throwError(() => error);
      }),
      tap(() => this.notifications.info('Données admin locales synchronisées')),
      map(() => undefined)
    );
  }

  triggerAction(request: AdminActionRequest): Observable<AdminJob> {
    return this.api.post<{ job: AdminJob }>('/admin/jobs', request).pipe(
      tap(response => {
        this.jobs$.next([response.job, ...this.jobs$.value]);
        this.notifications.success(`Action ${request.action} déclenchée`);
      }),
      catchError(error => {
        this.notifications.error('Action refusée ou invalide');
        return throwError(() => error);
      }),
      map(res => res.job)
    );
  }

  createClient(input: LocalClientInput): Observable<LocalClient> {
    return this.api.post<{ client: LocalClient }>('/admin/clients', input).pipe(
      tap(response => {
        this.clients$.next([response.client, ...this.clients$.value]);
        this.notifications.success(`Client ${response.client.name} créé`);
      }),
      catchError(error => {
        this.notifications.error('Création client impossible');
        return throwError(() => error);
      }),
      map(res => res.client)
    );
  }

  syncClient(clientId: string): Observable<LocalClient> {
    return this.api.post<{ client: LocalClient }>(`/admin/clients/${clientId}/sync`, {}).pipe(
      tap(response => {
        this.clients$.next(
          this.clients$.value.map(existing => (existing.id === clientId ? response.client : existing))
        );
        this.notifications.success(`Client ${response.client.name} resynchronisé`);
      }),
      catchError(error => {
        this.notifications.error('Synchronisation client impossible');
        return throwError(() => error);
      }),
      map(res => res.client)
    );
  }

  getActionLabel(action: AdminActionType): string {
    switch (action) {
      case 'build:central':
        return 'Build front central';
      case 'build:raspberry':
        return 'Build Raspberry';
      case 'deploy:raspberry':
        return 'Déploiement Raspberry';
      case 'tests:full':
        return 'Tests complets';
      case 'sync:clients':
        return 'Relance synchronisation clients';
      case 'maintenance:restart':
        return 'Redémarrage services';
      default:
        return action;
    }
  }
}
