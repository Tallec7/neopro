import { Injectable } from "@angular/core";
import { Command } from "../interfaces/command.interface";

declare let io: any;

@Injectable({providedIn: 'root'})
export class SocketService {
  private socket: any

  public initialize() {
    try {
      this.socket = io();
    } catch (e) {
      if (e instanceof ReferenceError) {
          console.error('socket service : not initialized, reference error')
      }
    }
  }

  public on(action: string, callback: (data: Command) => void) {
    if (this.socket) {
      console.log('socket service : on', action);
      this.socket.on(action, callback);
    } else {
      console.error('socket service : not called on due to not initialized');
    }
  }

  public emit(action: string, data: Command) {
    if (this.socket) {
      console.log('socket service : emit', action, data);
      this.socket.emit(action, data);
    } else {
      console.error('socket service : not called on due to not initialized');
    }
  }
}