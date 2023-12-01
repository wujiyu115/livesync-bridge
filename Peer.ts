import { join as joinPosix } from "https://deno.land/std@0.203.0/path/posix.ts";
import { FileInfo } from "./lib/src/DirectFileManipulator.ts";
import { FilePathWithPrefix, LOG_LEVEL, LOG_LEVEL_DEBUG, LOG_LEVEL_INFO } from "./lib/src/types.ts";
import { PeerConf, FileData } from "./types.ts";
import { Logger } from "./lib/src/logger.ts";
import { LRUCache } from "./lib/src/LRUCache.ts";
import { computeHash } from "./util.ts";

export type DispatchFun = (source: Peer, path: string, data: FileData | false) => Promise<void>;

export abstract class Peer {
    config: PeerConf;
    // hub: Hub;
    dispatchToHub: DispatchFun;
    constructor(conf: PeerConf, dispatcher: DispatchFun) {
        this.config = conf;
        this.dispatchToHub = dispatcher;
    }
    toLocalPath(path: string) {

        const r = joinPosix(this.config.baseDir, path);
        const ret = (r.startsWith("_")) ? ("/" + r) : r;
        // this.debugLog(`**TOLOCAL: ${path} => ${ret}`);
        return ret;
    }
    toGlobalPath(pathSrc: string) {
        let path = pathSrc.startsWith("_") ? pathSrc.substring(1) : pathSrc;
        if (path.startsWith(this.config.baseDir)) {
            path = path.substring(this.config.baseDir.length);
        }
        // this.debugLog(`**TOLOCAL: ${pathSrc} => ${path}`);
        return path;
    }
    abstract delete(path: string): Promise<boolean>;
    abstract put(path: string, data: FileData): Promise<boolean>;
    abstract get(path: FilePathWithPrefix): Promise<false | FileData>;
    abstract start(): Promise<void>;
    abstract stop(): Promise<void>;
    cache = new LRUCache<string, string>(300, 10000000, true);
    async isRepeating(path: string, data: FileData | false) {
        const d = await computeHash(data === false ? ["\u0001Deleted"] : data.data);

        if (this.cache.has(path) && this.cache.get(path) == d) {
            return true;
        }
        this.cache.set(path, d);
        return false;
    }
    receiveLog(message: string, level?: LOG_LEVEL) {
        Logger(`[${this.config.name}] <-- ${message}`, level ?? LOG_LEVEL_INFO);
    }
    sendLog(message: string, level?: LOG_LEVEL) {
        Logger(`[${this.config.name}] --> ${message}`, level ?? LOG_LEVEL_INFO);
    }
    normalLog(message: string, level?: LOG_LEVEL) {
        Logger(`[${this.config.name}] ${message}`, level ?? LOG_LEVEL_INFO);
    }
    debugLog(message: string, level?: LOG_LEVEL) {
        Logger(`[${this.config.name}] ${message}`, level ?? LOG_LEVEL_DEBUG);
    }
    _getKey(key: string) {
        return `${this.config.name}-${this.config.type}-${this.config.baseDir}-${key}`;
    }
    setSetting(key: string, value: string) {
        return localStorage.setItem(this._getKey(key), value);
    }
    getSetting(key: string) {
        return localStorage.getItem(this._getKey(key));
    }
    compareDate(a: FileInfo, b: FileInfo) {
        const aMTime = ~~(a?.mtime ?? 0 / 1000);
        const bMTime = ~~(b?.mtime ?? 0 / 1000);
        return aMTime - bMTime;
    }
}