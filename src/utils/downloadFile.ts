/**
 * API for downloading information from web
 */
import { logger } from "./logger";
import fetch from 'node-fetch';

export async function downloadFromMultiSources(urls: string[]): Promise<string | undefined> {
    for (const url of urls) {
        try {
            const data = await fetch(url);
            const val = await data.text();
            if (val) {
                return val;
            }
        } catch (e) {
            logger.channel(JSON.stringify(e)).show();
        }
    }
}