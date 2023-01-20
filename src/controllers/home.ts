import url from 'url';

import { Request, Response, NextFunction } from 'express';

import plugins from '../plugins';
import meta from '../meta';
import user from '../user';

import { SettingsObject } from '../types';


function adminHomePageRoute():string {
    return ((meta.config.homePageRoute === 'custom' ? meta.config.homePageCustom : meta.config.homePageRoute) || 'categories').replace(/^\//, '') as string;
}

async function getUserHomeRoute(uid : number) : Promise<string> {
    const settings : SettingsObject = await user.getSettings(uid) as SettingsObject;
    let route : string = adminHomePageRoute();

    if (settings.homePageRoute !== 'undefined' && settings.homePageRoute !== 'none') {
        route = (settings.homePageRoute || route).replace(/^\/+/, '');
    }

    return route;
}

export async function rewrite(req: Request & { uid: number }, res : Response, next: NextFunction): Promise<void> {
    if (req.path !== '/' && req.path !== '/api/' && req.path !== '/api') {
        return next();
    }

    let route : string = adminHomePageRoute();
    if (meta.config.allowUserHomePage) {
        route = await getUserHomeRoute(req.uid);
    }

    let parsedUrl : url.UrlWithParsedQuery;
    try {
        parsedUrl = url.parse(route, true);
    } catch (err : unknown) {
        return next(err);
    }

    const { pathname } = parsedUrl;
    const hook = `action:homepage.get:${pathname}`;

    if (!plugins.hooks.hasListeners(hook)) {
        req.url = req.path + (!req.path.endsWith('/') ? '/' : '') + pathname;
    } else {
        res.locals.homePageRoute = pathname;
    }
    req.query = Object.assign(parsedUrl.query, req.query);

    next();
}

export function pluginHook(req: Request, res : Response, next: NextFunction):void {
    const hook = `action:homepage.get:${res.locals.homePageRoute}`;

    plugins.hooks.fire(hook, {
        req: req,
        res: res,
        next: next,
    });
}
