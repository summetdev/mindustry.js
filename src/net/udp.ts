import { createSocket, Socket } from 'dgram';
import * as util from 'util';
import { NOTFOUND } from 'dns';
import { Endpoint } from './endpoint';
import { Address } from './address';
import { HostUnavailableError } from './errors';
import Timeout = NodeJS.Timeout;

/* eslint-disable no-underscore-dangle */
export class UdpSocket extends Endpoint {
    private socket: Socket;

    private timeout = 2000;
    private timer?: Timeout;

    constructor(address: Address, port: number) {
        super(address, port);
        this.socket = createSocket('udp4');
    }

    setTimeout(timeout: number): void {
        this.timeout = timeout;
    }

    async send(data: Buffer): Promise<Buffer> {
        const send = util.promisify(this._send.bind(this));
        const buffer = await send(data) as Buffer;

        return buffer;
    }

    private _send(data: Buffer, callback: (err: Error | null, buffer?: Buffer) => void): void {
        this.socket.once('error', (err) => {
            callback(
                err.message.includes(NOTFOUND) ? new HostUnavailableError(this) : err,
                Buffer.of(),
            );
        });

        this.socket.once('message', (buffer) => {
            this.clearTimeout();
            callback(null, buffer);
        });

        this.runTimeout(callback);
        this.socket.send(data, this.port, this.address);
    }

    private runTimeout(callback: (err: Error) => void): void {
       this.timer = setTimeout(() => {
            callback(new HostUnavailableError(this));
       }, this.timeout);
    }

    private clearTimeout(): void {
        clearTimeout(this.timeout);
    }
}
