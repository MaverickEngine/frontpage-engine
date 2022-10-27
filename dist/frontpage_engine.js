var frontpage_engine = (function () {
    'use strict';

    class FrontPageEngineSocketServer {
        constructor(domain = "http://localhost", channel = "default") {
            this.domain = domain;
            this.channel = channel;
            this.connect();
            this.callbacks = [];
        }

        connect() {
            this.socket = new WebSocket('wss://wssb.revengine.dailymaverick.co.za/_ws/');
            this.socket.onopen = this.onOpen.bind(this);
            this.socket.onclose = this.onClose.bind(this);
            this.socket.onmessage = this.onMessage.bind(this);
            if (this.channel) {
                this.subscribe();
            }
        }

        close() {
            this.channel = null;
            this.domain = null;
            this.socket.close();
        }

        subscribe(channel = null) {
            if (channel) {
                this.channel = channel;
            }
            if (this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({ event: "subscribe", channel: this.channel, domain: this.domain }));
            } else {
                this.socket.onopen = () => {
                    this.socket.send(JSON.stringify({ event: "subscribe", channel: this.channel, domain: this.domain }));
                };
            }
        }

        on(name, callback) {
            this.callbacks.push({ name, callback });
        }

        onOpen(event) {
            console.log(event);
        }

        onMessage(message) {
            console.log({ data: message.data });
            const data = JSON.parse(message.data);
            Promise.all(this.callbacks.map(callback => {
                if (callback.name === data.name) {
                    console.log("Calling callback", callback.name);
                    return callback.callback(data);
                }
            }));
        }

        onClose(event) {
            // Reconnect
            console.log("Reconnecting...");
            this.connect();
            console.log(event);
        }

        sendMessage(message) {
            console.log("Sending message", message);
            if (typeof message !== 'object' || Array.isArray(message) || message === null) {
                message = { message };
            }
            if (!message.message) {
                throw new Error('Invalid message');
            }
            if (!message.event) {
                message.event = "message";
            }
            message.channel = this.channel;
            message.domain = this.domain;
            console.log(message);
            // Wait for the connection to be established before sending a message.
            if (this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify(message));
            } else {
                setTimeout(() => this.sendMessage(message), 100);
            }
        }
    }

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function set_store_value(store, ret, value) {
        store.set(value);
        return ret;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function append_styles(target, style_sheet_id, styles) {
        const append_styles_to = get_root_for_style(target);
        if (!append_styles_to.getElementById(style_sheet_id)) {
            const style = element('style');
            style.id = style_sheet_id;
            style.textContent = styles;
            append_stylesheet(append_styles_to, style);
        }
    }
    function get_root_for_style(node) {
        if (!node)
            return document;
        const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
        if (root && root.host) {
            return root;
        }
        return node.ownerDocument;
    }
    function append_empty_stylesheet(node) {
        const style_element = element('style');
        append_stylesheet(get_root_for_style(node), style_element);
        return style_element.sheet;
    }
    function append_stylesheet(node, style) {
        append(node.head || node, style);
        return style.sheet;
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    // we need to store the information for multiple documents because a Svelte application could also contain iframes
    // https://github.com/sveltejs/svelte/issues/3624
    const managed_styles = new Map();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_style_information(doc, node) {
        const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
        managed_styles.set(doc, info);
        return info;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = get_root_for_style(node);
        const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
        if (!rules[name]) {
            rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            managed_styles.forEach(info => {
                const { ownerNode } = info.stylesheet;
                // there is no ownerNode if it runs on jsdom.
                if (ownerNode)
                    detach(ownerNode);
            });
            managed_styles.clear();
        });
    }

    function create_animation(node, from, fn, params) {
        if (!from)
            return noop;
        const to = node.getBoundingClientRect();
        if (from.left === to.left && from.right === to.right && from.top === to.top && from.bottom === to.bottom)
            return noop;
        const { delay = 0, duration = 300, easing = identity, 
        // @ts-ignore todo: should this be separated from destructuring? Or start/end added to public api and documentation?
        start: start_time = now() + delay, 
        // @ts-ignore todo:
        end = start_time + duration, tick = noop, css } = fn(node, { from, to }, params);
        let running = true;
        let started = false;
        let name;
        function start() {
            if (css) {
                name = create_rule(node, 0, 1, duration, delay, easing, css);
            }
            if (!delay) {
                started = true;
            }
        }
        function stop() {
            if (css)
                delete_rule(node, name);
            running = false;
        }
        loop(now => {
            if (!started && now >= start_time) {
                started = true;
            }
            if (started && now >= end) {
                tick(1, 0);
                stop();
            }
            if (!running) {
                return false;
            }
            if (started) {
                const p = now - start_time;
                const t = 0 + 1 * easing(p / duration);
                tick(t, 1 - t);
            }
            return true;
        });
        start();
        tick(0, 1);
        return stop;
    }
    function fix_position(node) {
        const style = getComputedStyle(node);
        if (style.position !== 'absolute' && style.position !== 'fixed') {
            const { width, height } = style;
            const a = node.getBoundingClientRect();
            node.style.position = 'absolute';
            node.style.width = width;
            node.style.height = height;
            add_transform(node, a);
        }
    }
    function add_transform(node, a) {
        const b = node.getBoundingClientRect();
        if (a.left !== b.left || a.top !== b.top) {
            const style = getComputedStyle(node);
            const transform = style.transform === 'none' ? '' : style.transform;
            node.style.transform = `${transform} translate(${a.left - b.left}px, ${a.top - b.top}px)`;
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    /**
     * Schedules a callback to run immediately before the component is unmounted.
     *
     * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
     * only one that runs inside a server-side component.
     *
     * https://svelte.dev/docs#run-time-svelte-ondestroy
     */
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    /**
     * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
     * Event dispatchers are functions that can take two arguments: `name` and `detail`.
     *
     * Component events created with `createEventDispatcher` create a
     * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
     * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
     * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
     * property and can contain any type of data.
     *
     * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
     */
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    const null_transition = { duration: 0 };
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function fix_and_outro_and_destroy_block(block, lookup) {
        block.f();
        outro_and_destroy_block(block, lookup);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    var queryString = {};

    var strictUriEncode = str => encodeURIComponent(str).replace(/[!'()*]/g, x => `%${x.charCodeAt(0).toString(16).toUpperCase()}`);

    var token = '%[a-f0-9]{2}';
    var singleMatcher = new RegExp(token, 'gi');
    var multiMatcher = new RegExp('(' + token + ')+', 'gi');

    function decodeComponents(components, split) {
    	try {
    		// Try to decode the entire string first
    		return decodeURIComponent(components.join(''));
    	} catch (err) {
    		// Do nothing
    	}

    	if (components.length === 1) {
    		return components;
    	}

    	split = split || 1;

    	// Split the array in 2 parts
    	var left = components.slice(0, split);
    	var right = components.slice(split);

    	return Array.prototype.concat.call([], decodeComponents(left), decodeComponents(right));
    }

    function decode(input) {
    	try {
    		return decodeURIComponent(input);
    	} catch (err) {
    		var tokens = input.match(singleMatcher);

    		for (var i = 1; i < tokens.length; i++) {
    			input = decodeComponents(tokens, i).join('');

    			tokens = input.match(singleMatcher);
    		}

    		return input;
    	}
    }

    function customDecodeURIComponent(input) {
    	// Keep track of all the replacements and prefill the map with the `BOM`
    	var replaceMap = {
    		'%FE%FF': '\uFFFD\uFFFD',
    		'%FF%FE': '\uFFFD\uFFFD'
    	};

    	var match = multiMatcher.exec(input);
    	while (match) {
    		try {
    			// Decode as big chunks as possible
    			replaceMap[match[0]] = decodeURIComponent(match[0]);
    		} catch (err) {
    			var result = decode(match[0]);

    			if (result !== match[0]) {
    				replaceMap[match[0]] = result;
    			}
    		}

    		match = multiMatcher.exec(input);
    	}

    	// Add `%C2` at the end of the map to make sure it does not replace the combinator before everything else
    	replaceMap['%C2'] = '\uFFFD';

    	var entries = Object.keys(replaceMap);

    	for (var i = 0; i < entries.length; i++) {
    		// Replace all decoded components
    		var key = entries[i];
    		input = input.replace(new RegExp(key, 'g'), replaceMap[key]);
    	}

    	return input;
    }

    var decodeUriComponent = function (encodedURI) {
    	if (typeof encodedURI !== 'string') {
    		throw new TypeError('Expected `encodedURI` to be of type `string`, got `' + typeof encodedURI + '`');
    	}

    	try {
    		encodedURI = encodedURI.replace(/\+/g, ' ');

    		// Try the built in decoder first
    		return decodeURIComponent(encodedURI);
    	} catch (err) {
    		// Fallback to a more advanced decoder
    		return customDecodeURIComponent(encodedURI);
    	}
    };

    var splitOnFirst = (string, separator) => {
    	if (!(typeof string === 'string' && typeof separator === 'string')) {
    		throw new TypeError('Expected the arguments to be of type `string`');
    	}

    	if (separator === '') {
    		return [string];
    	}

    	const separatorIndex = string.indexOf(separator);

    	if (separatorIndex === -1) {
    		return [string];
    	}

    	return [
    		string.slice(0, separatorIndex),
    		string.slice(separatorIndex + separator.length)
    	];
    };

    var filterObj = function (obj, predicate) {
    	var ret = {};
    	var keys = Object.keys(obj);
    	var isArr = Array.isArray(predicate);

    	for (var i = 0; i < keys.length; i++) {
    		var key = keys[i];
    		var val = obj[key];

    		if (isArr ? predicate.indexOf(key) !== -1 : predicate(key, val, obj)) {
    			ret[key] = val;
    		}
    	}

    	return ret;
    };

    (function (exports) {
    	const strictUriEncode$1 = strictUriEncode;
    	const decodeComponent = decodeUriComponent;
    	const splitOnFirst$1 = splitOnFirst;
    	const filterObject = filterObj;

    	const isNullOrUndefined = value => value === null || value === undefined;

    	const encodeFragmentIdentifier = Symbol('encodeFragmentIdentifier');

    	function encoderForArrayFormat(options) {
    		switch (options.arrayFormat) {
    			case 'index':
    				return key => (result, value) => {
    					const index = result.length;

    					if (
    						value === undefined ||
    						(options.skipNull && value === null) ||
    						(options.skipEmptyString && value === '')
    					) {
    						return result;
    					}

    					if (value === null) {
    						return [...result, [encode(key, options), '[', index, ']'].join('')];
    					}

    					return [
    						...result,
    						[encode(key, options), '[', encode(index, options), ']=', encode(value, options)].join('')
    					];
    				};

    			case 'bracket':
    				return key => (result, value) => {
    					if (
    						value === undefined ||
    						(options.skipNull && value === null) ||
    						(options.skipEmptyString && value === '')
    					) {
    						return result;
    					}

    					if (value === null) {
    						return [...result, [encode(key, options), '[]'].join('')];
    					}

    					return [...result, [encode(key, options), '[]=', encode(value, options)].join('')];
    				};

    			case 'colon-list-separator':
    				return key => (result, value) => {
    					if (
    						value === undefined ||
    						(options.skipNull && value === null) ||
    						(options.skipEmptyString && value === '')
    					) {
    						return result;
    					}

    					if (value === null) {
    						return [...result, [encode(key, options), ':list='].join('')];
    					}

    					return [...result, [encode(key, options), ':list=', encode(value, options)].join('')];
    				};

    			case 'comma':
    			case 'separator':
    			case 'bracket-separator': {
    				const keyValueSep = options.arrayFormat === 'bracket-separator' ?
    					'[]=' :
    					'=';

    				return key => (result, value) => {
    					if (
    						value === undefined ||
    						(options.skipNull && value === null) ||
    						(options.skipEmptyString && value === '')
    					) {
    						return result;
    					}

    					// Translate null to an empty string so that it doesn't serialize as 'null'
    					value = value === null ? '' : value;

    					if (result.length === 0) {
    						return [[encode(key, options), keyValueSep, encode(value, options)].join('')];
    					}

    					return [[result, encode(value, options)].join(options.arrayFormatSeparator)];
    				};
    			}

    			default:
    				return key => (result, value) => {
    					if (
    						value === undefined ||
    						(options.skipNull && value === null) ||
    						(options.skipEmptyString && value === '')
    					) {
    						return result;
    					}

    					if (value === null) {
    						return [...result, encode(key, options)];
    					}

    					return [...result, [encode(key, options), '=', encode(value, options)].join('')];
    				};
    		}
    	}

    	function parserForArrayFormat(options) {
    		let result;

    		switch (options.arrayFormat) {
    			case 'index':
    				return (key, value, accumulator) => {
    					result = /\[(\d*)\]$/.exec(key);

    					key = key.replace(/\[\d*\]$/, '');

    					if (!result) {
    						accumulator[key] = value;
    						return;
    					}

    					if (accumulator[key] === undefined) {
    						accumulator[key] = {};
    					}

    					accumulator[key][result[1]] = value;
    				};

    			case 'bracket':
    				return (key, value, accumulator) => {
    					result = /(\[\])$/.exec(key);
    					key = key.replace(/\[\]$/, '');

    					if (!result) {
    						accumulator[key] = value;
    						return;
    					}

    					if (accumulator[key] === undefined) {
    						accumulator[key] = [value];
    						return;
    					}

    					accumulator[key] = [].concat(accumulator[key], value);
    				};

    			case 'colon-list-separator':
    				return (key, value, accumulator) => {
    					result = /(:list)$/.exec(key);
    					key = key.replace(/:list$/, '');

    					if (!result) {
    						accumulator[key] = value;
    						return;
    					}

    					if (accumulator[key] === undefined) {
    						accumulator[key] = [value];
    						return;
    					}

    					accumulator[key] = [].concat(accumulator[key], value);
    				};

    			case 'comma':
    			case 'separator':
    				return (key, value, accumulator) => {
    					const isArray = typeof value === 'string' && value.includes(options.arrayFormatSeparator);
    					const isEncodedArray = (typeof value === 'string' && !isArray && decode(value, options).includes(options.arrayFormatSeparator));
    					value = isEncodedArray ? decode(value, options) : value;
    					const newValue = isArray || isEncodedArray ? value.split(options.arrayFormatSeparator).map(item => decode(item, options)) : value === null ? value : decode(value, options);
    					accumulator[key] = newValue;
    				};

    			case 'bracket-separator':
    				return (key, value, accumulator) => {
    					const isArray = /(\[\])$/.test(key);
    					key = key.replace(/\[\]$/, '');

    					if (!isArray) {
    						accumulator[key] = value ? decode(value, options) : value;
    						return;
    					}

    					const arrayValue = value === null ?
    						[] :
    						value.split(options.arrayFormatSeparator).map(item => decode(item, options));

    					if (accumulator[key] === undefined) {
    						accumulator[key] = arrayValue;
    						return;
    					}

    					accumulator[key] = [].concat(accumulator[key], arrayValue);
    				};

    			default:
    				return (key, value, accumulator) => {
    					if (accumulator[key] === undefined) {
    						accumulator[key] = value;
    						return;
    					}

    					accumulator[key] = [].concat(accumulator[key], value);
    				};
    		}
    	}

    	function validateArrayFormatSeparator(value) {
    		if (typeof value !== 'string' || value.length !== 1) {
    			throw new TypeError('arrayFormatSeparator must be single character string');
    		}
    	}

    	function encode(value, options) {
    		if (options.encode) {
    			return options.strict ? strictUriEncode$1(value) : encodeURIComponent(value);
    		}

    		return value;
    	}

    	function decode(value, options) {
    		if (options.decode) {
    			return decodeComponent(value);
    		}

    		return value;
    	}

    	function keysSorter(input) {
    		if (Array.isArray(input)) {
    			return input.sort();
    		}

    		if (typeof input === 'object') {
    			return keysSorter(Object.keys(input))
    				.sort((a, b) => Number(a) - Number(b))
    				.map(key => input[key]);
    		}

    		return input;
    	}

    	function removeHash(input) {
    		const hashStart = input.indexOf('#');
    		if (hashStart !== -1) {
    			input = input.slice(0, hashStart);
    		}

    		return input;
    	}

    	function getHash(url) {
    		let hash = '';
    		const hashStart = url.indexOf('#');
    		if (hashStart !== -1) {
    			hash = url.slice(hashStart);
    		}

    		return hash;
    	}

    	function extract(input) {
    		input = removeHash(input);
    		const queryStart = input.indexOf('?');
    		if (queryStart === -1) {
    			return '';
    		}

    		return input.slice(queryStart + 1);
    	}

    	function parseValue(value, options) {
    		if (options.parseNumbers && !Number.isNaN(Number(value)) && (typeof value === 'string' && value.trim() !== '')) {
    			value = Number(value);
    		} else if (options.parseBooleans && value !== null && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')) {
    			value = value.toLowerCase() === 'true';
    		}

    		return value;
    	}

    	function parse(query, options) {
    		options = Object.assign({
    			decode: true,
    			sort: true,
    			arrayFormat: 'none',
    			arrayFormatSeparator: ',',
    			parseNumbers: false,
    			parseBooleans: false
    		}, options);

    		validateArrayFormatSeparator(options.arrayFormatSeparator);

    		const formatter = parserForArrayFormat(options);

    		// Create an object with no prototype
    		const ret = Object.create(null);

    		if (typeof query !== 'string') {
    			return ret;
    		}

    		query = query.trim().replace(/^[?#&]/, '');

    		if (!query) {
    			return ret;
    		}

    		for (const param of query.split('&')) {
    			if (param === '') {
    				continue;
    			}

    			let [key, value] = splitOnFirst$1(options.decode ? param.replace(/\+/g, ' ') : param, '=');

    			// Missing `=` should be `null`:
    			// http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
    			value = value === undefined ? null : ['comma', 'separator', 'bracket-separator'].includes(options.arrayFormat) ? value : decode(value, options);
    			formatter(decode(key, options), value, ret);
    		}

    		for (const key of Object.keys(ret)) {
    			const value = ret[key];
    			if (typeof value === 'object' && value !== null) {
    				for (const k of Object.keys(value)) {
    					value[k] = parseValue(value[k], options);
    				}
    			} else {
    				ret[key] = parseValue(value, options);
    			}
    		}

    		if (options.sort === false) {
    			return ret;
    		}

    		return (options.sort === true ? Object.keys(ret).sort() : Object.keys(ret).sort(options.sort)).reduce((result, key) => {
    			const value = ret[key];
    			if (Boolean(value) && typeof value === 'object' && !Array.isArray(value)) {
    				// Sort object keys, not values
    				result[key] = keysSorter(value);
    			} else {
    				result[key] = value;
    			}

    			return result;
    		}, Object.create(null));
    	}

    	exports.extract = extract;
    	exports.parse = parse;

    	exports.stringify = (object, options) => {
    		if (!object) {
    			return '';
    		}

    		options = Object.assign({
    			encode: true,
    			strict: true,
    			arrayFormat: 'none',
    			arrayFormatSeparator: ','
    		}, options);

    		validateArrayFormatSeparator(options.arrayFormatSeparator);

    		const shouldFilter = key => (
    			(options.skipNull && isNullOrUndefined(object[key])) ||
    			(options.skipEmptyString && object[key] === '')
    		);

    		const formatter = encoderForArrayFormat(options);

    		const objectCopy = {};

    		for (const key of Object.keys(object)) {
    			if (!shouldFilter(key)) {
    				objectCopy[key] = object[key];
    			}
    		}

    		const keys = Object.keys(objectCopy);

    		if (options.sort !== false) {
    			keys.sort(options.sort);
    		}

    		return keys.map(key => {
    			const value = object[key];

    			if (value === undefined) {
    				return '';
    			}

    			if (value === null) {
    				return encode(key, options);
    			}

    			if (Array.isArray(value)) {
    				if (value.length === 0 && options.arrayFormat === 'bracket-separator') {
    					return encode(key, options) + '[]';
    				}

    				return value
    					.reduce(formatter(key), [])
    					.join('&');
    			}

    			return encode(key, options) + '=' + encode(value, options);
    		}).filter(x => x.length > 0).join('&');
    	};

    	exports.parseUrl = (url, options) => {
    		options = Object.assign({
    			decode: true
    		}, options);

    		const [url_, hash] = splitOnFirst$1(url, '#');

    		return Object.assign(
    			{
    				url: url_.split('?')[0] || '',
    				query: parse(extract(url), options)
    			},
    			options && options.parseFragmentIdentifier && hash ? {fragmentIdentifier: decode(hash, options)} : {}
    		);
    	};

    	exports.stringifyUrl = (object, options) => {
    		options = Object.assign({
    			encode: true,
    			strict: true,
    			[encodeFragmentIdentifier]: true
    		}, options);

    		const url = removeHash(object.url).split('?')[0] || '';
    		const queryFromUrl = exports.extract(object.url);
    		const parsedQueryFromUrl = exports.parse(queryFromUrl, {sort: false});

    		const query = Object.assign(parsedQueryFromUrl, object.query);
    		let queryString = exports.stringify(query, options);
    		if (queryString) {
    			queryString = `?${queryString}`;
    		}

    		let hash = getHash(object.url);
    		if (object.fragmentIdentifier) {
    			hash = `#${options[encodeFragmentIdentifier] ? encode(object.fragmentIdentifier, options) : object.fragmentIdentifier}`;
    		}

    		return `${url}${queryString}${hash}`;
    	};

    	exports.pick = (input, filter, options) => {
    		options = Object.assign({
    			parseFragmentIdentifier: true,
    			[encodeFragmentIdentifier]: false
    		}, options);

    		const {url, query, fragmentIdentifier} = exports.parseUrl(input, options);
    		return exports.stringifyUrl({
    			url,
    			query: filterObject(query, filter),
    			fragmentIdentifier
    		}, options);
    	};

    	exports.exclude = (input, filter, options) => {
    		const exclusionFilter = Array.isArray(filter) ? key => !filter.includes(key) : (key, value) => !filter(key, value);

    		return exports.pick(input, exclusionFilter, options);
    	};
    } (queryString));

    const wp_api_post = async (action, data) => {
        const response = await fetch(ajax_var.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: queryString.stringify({
                action: action,
                nonce: ajax_var.nonce,
                ...data
            })
        });
        try {
            return await response.json()
        } catch (e) {
            throw new Error(response.text());
        }
    };

    const featuredPosts = writable([]);
    const unfeaturedPosts = writable([]);
    const unorderedPosts = writable([]);

    /* src/components/PostRow.svelte generated by Svelte v3.52.0 */

    function add_css$4(target) {
    	append_styles(target, "svelte-1ykt94j", ".column-image.svelte-1ykt94j.svelte-1ykt94j{width:50px}.column-image.svelte-1ykt94j img.svelte-1ykt94j{width:50px;height:50px}");
    }

    // (6:4) {#if post.image}
    function create_if_block$1(ctx) {
    	let img;
    	let img_src_value;
    	let img_alt_value;

    	return {
    		c() {
    			img = element("img");
    			attr(img, "class", "image column-image svelte-1ykt94j");
    			attr(img, "width", "50");
    			attr(img, "height", "50");
    			if (!src_url_equal(img.src, img_src_value = /*post*/ ctx[0].image)) attr(img, "src", img_src_value);
    			attr(img, "alt", img_alt_value = /*post*/ ctx[0].title);
    		},
    		m(target, anchor) {
    			insert(target, img, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*post*/ 1 && !src_url_equal(img.src, img_src_value = /*post*/ ctx[0].image)) {
    				attr(img, "src", img_src_value);
    			}

    			if (dirty & /*post*/ 1 && img_alt_value !== (img_alt_value = /*post*/ ctx[0].title)) {
    				attr(img, "alt", img_alt_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(img);
    		}
    	};
    }

    function create_fragment$4(ctx) {
    	let td0;
    	let t0;
    	let td1;
    	let strong;
    	let a;
    	let t1_value = /*post*/ ctx[0].title + "";
    	let t1;
    	let a_href_value;
    	let t2;
    	let td2;
    	let t3_value = /*post*/ ctx[0].author + "";
    	let t3;
    	let t4;
    	let td3;
    	let t5_value = /*post*/ ctx[0].id + "";
    	let t5;
    	let t6;
    	let td4;
    	let t7_value = /*post*/ ctx[0].date_published + "";
    	let t7;
    	let if_block = /*post*/ ctx[0].image && create_if_block$1(ctx);

    	return {
    		c() {
    			td0 = element("td");
    			if (if_block) if_block.c();
    			t0 = space();
    			td1 = element("td");
    			strong = element("strong");
    			a = element("a");
    			t1 = text(t1_value);
    			t2 = space();
    			td2 = element("td");
    			t3 = text(t3_value);
    			t4 = space();
    			td3 = element("td");
    			t5 = text(t5_value);
    			t6 = space();
    			td4 = element("td");
    			t7 = text(t7_value);
    			attr(td0, "class", "column-image svelte-1ykt94j");
    			attr(a, "class", "row-title");
    			attr(a, "href", a_href_value = /*post*/ ctx[0].link);
    			attr(td1, "class", "column-title");
    			attr(td2, "class", "column-author");
    			attr(td3, "class", "column-tags");
    			attr(td4, "class", "column-published");
    		},
    		m(target, anchor) {
    			insert(target, td0, anchor);
    			if (if_block) if_block.m(td0, null);
    			insert(target, t0, anchor);
    			insert(target, td1, anchor);
    			append(td1, strong);
    			append(strong, a);
    			append(a, t1);
    			insert(target, t2, anchor);
    			insert(target, td2, anchor);
    			append(td2, t3);
    			insert(target, t4, anchor);
    			insert(target, td3, anchor);
    			append(td3, t5);
    			insert(target, t6, anchor);
    			insert(target, td4, anchor);
    			append(td4, t7);
    		},
    		p(ctx, [dirty]) {
    			if (/*post*/ ctx[0].image) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(td0, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*post*/ 1 && t1_value !== (t1_value = /*post*/ ctx[0].title + "")) set_data(t1, t1_value);

    			if (dirty & /*post*/ 1 && a_href_value !== (a_href_value = /*post*/ ctx[0].link)) {
    				attr(a, "href", a_href_value);
    			}

    			if (dirty & /*post*/ 1 && t3_value !== (t3_value = /*post*/ ctx[0].author + "")) set_data(t3, t3_value);
    			if (dirty & /*post*/ 1 && t5_value !== (t5_value = /*post*/ ctx[0].id + "")) set_data(t5, t5_value);
    			if (dirty & /*post*/ 1 && t7_value !== (t7_value = /*post*/ ctx[0].date_published + "")) set_data(t7, t7_value);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(td0);
    			if (if_block) if_block.d();
    			if (detaching) detach(t0);
    			if (detaching) detach(td1);
    			if (detaching) detach(t2);
    			if (detaching) detach(td2);
    			if (detaching) detach(t4);
    			if (detaching) detach(td3);
    			if (detaching) detach(t6);
    			if (detaching) detach(td4);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { post } = $$props;

    	$$self.$$set = $$props => {
    		if ('post' in $$props) $$invalidate(0, post = $$props.post);
    	};

    	return [post];
    }

    class PostRow extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { post: 0 }, add_css$4);
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function flip(node, { from, to }, params = {}) {
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        const [ox, oy] = style.transformOrigin.split(' ').map(parseFloat);
        const dx = (from.left + from.width * ox / to.width) - (to.left + ox);
        const dy = (from.top + from.height * oy / to.height) - (to.top + oy);
        const { delay = 0, duration = (d) => Math.sqrt(d) * 120, easing = cubicOut } = params;
        return {
            delay,
            duration: is_function(duration) ? duration(Math.sqrt(dx * dx + dy * dy)) : duration,
            easing,
            css: (t, u) => {
                const x = u * dx;
                const y = u * dy;
                const sx = t + u * from.width / to.width;
                const sy = t + u * from.height / to.height;
                return `transform: ${transform} translate(${x}px, ${y}px) scale(${sx}, ${sy});`;
            }
        };
    }

    /* src/components/FrontpageTable.svelte generated by Svelte v3.52.0 */

    function add_css$3(target) {
    	append_styles(target, "svelte-1cbifzv", "tr.is-active.svelte-1cbifzv{background-color:rgb(128, 162, 213) !important}.column-header-image.svelte-1cbifzv{width:50px}.column-header-title.svelte-1cbifzv{width:500px}");
    }

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	child_ctx[11] = i;
    	return child_ctx;
    }

    // (60:8) {#each $featuredPosts as post, index (post.id)}
    function create_each_block$1(key_1, ctx) {
    	let tr;
    	let th;
    	let t2;
    	let postrow;
    	let t3;
    	let tr_id_value;
    	let rect;
    	let stop_animation = noop;
    	let current;
    	let mounted;
    	let dispose;

    	postrow = new PostRow({
    			props: {
    				post: /*post*/ ctx[9],
    				index: /*index*/ ctx[11]
    			}
    		});

    	function dragstart_handler(...args) {
    		return /*dragstart_handler*/ ctx[5](/*index*/ ctx[11], ...args);
    	}

    	function drop_handler(...args) {
    		return /*drop_handler*/ ctx[6](/*index*/ ctx[11], ...args);
    	}

    	function dragenter_handler() {
    		return /*dragenter_handler*/ ctx[7](/*index*/ ctx[11]);
    	}

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			tr = element("tr");
    			th = element("th");

    			th.innerHTML = `<label class="screen-reader-text" for="cb-select-1">Select</label> 
                <input class="cb-select-1" type="checkbox"/>`;

    			t2 = space();
    			create_component(postrow.$$.fragment);
    			t3 = space();
    			attr(th, "scope", "row");
    			attr(th, "class", "check-column");
    			attr(tr, "id", tr_id_value = "post-" + /*post*/ ctx[9].id);
    			attr(tr, "draggable", true);
    			attr(tr, "ondragover", "return false");
    			attr(tr, "class", "svelte-1cbifzv");
    			toggle_class(tr, "is-active", /*hovering*/ ctx[0] === /*index*/ ctx[11]);
    			this.first = tr;
    		},
    		m(target, anchor) {
    			insert(target, tr, anchor);
    			append(tr, th);
    			append(tr, t2);
    			mount_component(postrow, tr, null);
    			append(tr, t3);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(tr, "dragstart", dragstart_handler),
    					listen(tr, "drop", prevent_default(drop_handler)),
    					listen(tr, "dragenter", dragenter_handler)
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const postrow_changes = {};
    			if (dirty & /*$featuredPosts*/ 2) postrow_changes.post = /*post*/ ctx[9];
    			if (dirty & /*$featuredPosts*/ 2) postrow_changes.index = /*index*/ ctx[11];
    			postrow.$set(postrow_changes);

    			if (!current || dirty & /*$featuredPosts*/ 2 && tr_id_value !== (tr_id_value = "post-" + /*post*/ ctx[9].id)) {
    				attr(tr, "id", tr_id_value);
    			}

    			if (!current || dirty & /*hovering, $featuredPosts*/ 3) {
    				toggle_class(tr, "is-active", /*hovering*/ ctx[0] === /*index*/ ctx[11]);
    			}
    		},
    		r() {
    			rect = tr.getBoundingClientRect();
    		},
    		f() {
    			fix_position(tr);
    			stop_animation();
    		},
    		a() {
    			stop_animation();
    			stop_animation = create_animation(tr, rect, flip, { duration: 600 });
    		},
    		i(local) {
    			if (current) return;
    			transition_in(postrow.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(postrow.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(tr);
    			destroy_component(postrow);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let table;
    	let thead;
    	let t12;
    	let tbody;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;
    	let each_value = /*$featuredPosts*/ ctx[1];
    	const get_key = ctx => /*post*/ ctx[9].id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	return {
    		c() {
    			table = element("table");
    			thead = element("thead");

    			thead.innerHTML = `<tr><td class="manage-column check-column"><label class="screen-reader-text" for="cb-select-all-1">Select All</label> 
                <input class="cb-select-all-1" type="checkbox"/></td> 
            <th scope="col" class="column-header-image svelte-1cbifzv">Image</th> 
            <th scope="col" class="column-header-title svelte-1cbifzv">Title</th> 
            <th scope="col" class="manage-column">Author</th> 
            <th scope="col" class="manage-column">Tags</th> 
            <th scope="col" class="manage-column">Published</th></tr>`;

    			t12 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(table, "class", "wp-list-table widefat fixed striped table-view-list featuredposts");
    		},
    		m(target, anchor) {
    			insert(target, table, anchor);
    			append(table, thead);
    			append(table, t12);
    			append(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*$featuredPosts, hovering, dragStart, dragDrop*/ 15) {
    				each_value = /*$featuredPosts*/ ctx[1];
    				group_outros();
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, tbody, fix_and_outro_and_destroy_block, create_each_block$1, null, get_each_context$1);
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].a();
    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(table);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $featuredPosts;
    	component_subscribe($$self, featuredPosts, $$value => $$invalidate(1, $featuredPosts = $$value));
    	const dispatch = createEventDispatcher();
    	let { frontpage_id } = $$props;
    	let hovering = false;

    	const dragStart = (e, i) => {
    		console.log("dragStart", i);
    		e.dataTransfer.effectAllowed = 'move';
    		e.dataTransfer.dropEffect = 'move';
    		const start = i;
    		e.dataTransfer.setData('text/plain', start);
    	};

    	const dragDrop = async (e, target) => {
    		console.log("drop", target);
    		e.dataTransfer.dropEffect = 'move';
    		const start = parseInt(e.dataTransfer.getData("text/plain"));
    		const posts = $featuredPosts;

    		if (start < target) {
    			posts.splice(target + 1, 0, posts[start]);
    			posts.splice(start, 1);
    		} else {
    			posts.splice(target, 0, posts[start]);
    			posts.splice(start + 1, 1);
    		}

    		featuredPosts.set(posts);
    		dispatch("updated");
    		$$invalidate(0, hovering = null);
    	};

    	onMount(() => {
    		console.log("onMount");
    	});

    	const dragstart_handler = (index, e) => dragStart(e, index);
    	const drop_handler = (index, e) => dragDrop(e, index);
    	const dragenter_handler = index => $$invalidate(0, hovering = index);

    	$$self.$$set = $$props => {
    		if ('frontpage_id' in $$props) $$invalidate(4, frontpage_id = $$props.frontpage_id);
    	};

    	return [
    		hovering,
    		$featuredPosts,
    		dragStart,
    		dragDrop,
    		frontpage_id,
    		dragstart_handler,
    		drop_handler,
    		dragenter_handler
    	];
    }

    class FrontpageTable extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { frontpage_id: 4 }, add_css$3);
    	}
    }

    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    var map_posts = post => {
        return {
            id: post.id,
            title: post.post_title,
            author: post.post_author,
            date_published: post.post_date,
            type: post.post_type,
            image: post.image,
            order: post.menu_order,
        }
    };

    /* src/components/AddPostTable.svelte generated by Svelte v3.52.0 */

    function add_css$2(target) {
    	append_styles(target, "svelte-1cbifzv", ".column-header-image.svelte-1cbifzv{width:50px}.column-header-title.svelte-1cbifzv{width:500px}");
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	child_ctx[12] = i;
    	return child_ctx;
    }

    // (75:8) {#each posts as post, index (post.id)}
    function create_each_block(key_1, ctx) {
    	let tr;
    	let th0;
    	let t2;
    	let postrow;
    	let t3;
    	let th1;
    	let button;
    	let t5;
    	let tr_id_value;
    	let tr_outro;
    	let current;
    	let mounted;
    	let dispose;

    	postrow = new PostRow({
    			props: {
    				post: /*post*/ ctx[10],
    				index: /*index*/ ctx[12]
    			}
    		});

    	function dragstart_handler(...args) {
    		return /*dragstart_handler*/ ctx[5](/*index*/ ctx[12], ...args);
    	}

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			tr = element("tr");
    			th0 = element("th");

    			th0.innerHTML = `<label class="screen-reader-text" for="cb-select-1">Select</label> 
                <input class="cb-select-1" type="checkbox"/>`;

    			t2 = space();
    			create_component(postrow.$$.fragment);
    			t3 = space();
    			th1 = element("th");
    			button = element("button");
    			button.textContent = "Add";
    			t5 = space();
    			attr(th0, "scope", "row");
    			attr(th0, "class", "check-column");
    			attr(button, "class", "button button-primary");
    			attr(tr, "id", tr_id_value = "post-" + /*post*/ ctx[10].id);
    			attr(tr, "draggable", "true");
    			this.first = tr;
    		},
    		m(target, anchor) {
    			insert(target, tr, anchor);
    			append(tr, th0);
    			append(tr, t2);
    			mount_component(postrow, tr, null);
    			append(tr, t3);
    			append(tr, th1);
    			append(th1, button);
    			append(tr, t5);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(button, "click", function () {
    						if (is_function(/*featurePost*/ ctx[2](/*post*/ ctx[10]))) /*featurePost*/ ctx[2](/*post*/ ctx[10]).apply(this, arguments);
    					}),
    					listen(tr, "dragstart", dragstart_handler)
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const postrow_changes = {};
    			if (dirty & /*posts*/ 1) postrow_changes.post = /*post*/ ctx[10];
    			if (dirty & /*posts*/ 1) postrow_changes.index = /*index*/ ctx[12];
    			postrow.$set(postrow_changes);

    			if (!current || dirty & /*posts*/ 1 && tr_id_value !== (tr_id_value = "post-" + /*post*/ ctx[10].id)) {
    				attr(tr, "id", tr_id_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(postrow.$$.fragment, local);
    			if (tr_outro) tr_outro.end(1);
    			current = true;
    		},
    		o(local) {
    			transition_out(postrow.$$.fragment, local);

    			if (local) {
    				tr_outro = create_out_transition(tr, fly, { y: -200, duration: 600 });
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(tr);
    			destroy_component(postrow);
    			if (detaching && tr_outro) tr_outro.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	let table;
    	let thead;
    	let t13;
    	let tbody;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;
    	let each_value = /*posts*/ ctx[0];
    	const get_key = ctx => /*post*/ ctx[10].id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	return {
    		c() {
    			table = element("table");
    			thead = element("thead");

    			thead.innerHTML = `<tr><td class="manage-column check-column"><label class="screen-reader-text" for="cb-select-all-1">Select All</label> 
                <input class="cb-select-all-1" type="checkbox"/></td> 
            <th scope="col" class="column-header-image svelte-1cbifzv">Image</th> 
            <th scope="col" class="column-header-title svelte-1cbifzv">Title</th> 
            <th scope="col" class="manage-column">Author</th> 
            <th scope="col" class="manage-column">Tags</th> 
            <th scope="col" class="manage-column">Published</th> 
            <th></th></tr>`;

    			t13 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(table, "class", "wp-list-table widefat fixed striped table-view-list featuredposts");
    		},
    		m(target, anchor) {
    			insert(target, table, anchor);
    			append(table, thead);
    			append(table, t13);
    			append(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*posts, dragStart, featurePost*/ 7) {
    				each_value = /*posts*/ ctx[0];
    				group_outros();
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, tbody, outro_and_destroy_block, create_each_block, null, get_each_context);
    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(table);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $unorderedPosts;
    	let $unfeaturedPosts;
    	let $featuredPosts;
    	component_subscribe($$self, unorderedPosts, $$value => $$invalidate(6, $unorderedPosts = $$value));
    	component_subscribe($$self, unfeaturedPosts, $$value => $$invalidate(7, $unfeaturedPosts = $$value));
    	component_subscribe($$self, featuredPosts, $$value => $$invalidate(8, $featuredPosts = $$value));
    	const dispatch = createEventDispatcher();
    	let { frontpage_id } = $$props;
    	let { type = "unfeatured" } = $$props;
    	let posts = [];

    	const dragStart = (e, i) => {
    		console.log("dragStart", i);
    		e.dataTransfer.effectAllowed = 'move';
    		e.dataTransfer.dropEffect = 'move';
    		const start = i;
    		e.dataTransfer.setData('text/plain', start);
    		dispatch("dragstart");
    	};

    	const featurePost = async post => {
    		console.log("featurePost", post);
    		$featuredPosts.push(post);

    		if (type === "unfeatured") {
    			set_store_value(unfeaturedPosts, $unfeaturedPosts = $unfeaturedPosts.filter(p => p.id !== post.id), $unfeaturedPosts);
    			$$invalidate(0, posts = $unfeaturedPosts);
    		} else if (type === "unordered") {
    			set_store_value(unorderedPosts, $unorderedPosts = $unorderedPosts.filter(p => p.id !== post.id), $unorderedPosts);
    			$$invalidate(0, posts = $unorderedPosts);
    			console.log("unorderdPosts", $unorderedPosts);
    		}

    		console.log("Calling updated");
    		dispatch("updated");
    	};

    	onMount(async () => {
    		if (type === "unfeatured") {
    			$$invalidate(0, posts = $unfeaturedPosts);
    			const result = await wp_api_post("frontpage_engine_fetch_unfeatured_posts", { id: frontpage_id });
    			set_store_value(unfeaturedPosts, $unfeaturedPosts = result.map(map_posts), $unfeaturedPosts);
    			$$invalidate(0, posts = $unfeaturedPosts);
    		} else if (type === "unordered") {
    			$$invalidate(0, posts = $unorderedPosts);
    			const result = await wp_api_post("frontpage_engine_fetch_unordered_posts", { id: frontpage_id });
    			set_store_value(unorderedPosts, $unorderedPosts = result.map(map_posts), $unorderedPosts);
    			$$invalidate(0, posts = $unorderedPosts);
    		}
    	});

    	const dragstart_handler = (index, e) => dragStart(e, index);

    	$$self.$$set = $$props => {
    		if ('frontpage_id' in $$props) $$invalidate(3, frontpage_id = $$props.frontpage_id);
    		if ('type' in $$props) $$invalidate(4, type = $$props.type);
    	};

    	return [posts, dragStart, featurePost, frontpage_id, type, dragstart_handler];
    }

    class AddPostTable extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { frontpage_id: 3, type: 4 }, add_css$2);
    	}
    }

    /* src/components/Modal.svelte generated by Svelte v3.52.0 */

    function add_css$1(target) {
    	append_styles(target, "svelte-1sdvd9m", ".modal-background.svelte-1sdvd9m{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.3);z-index:10000}.modal.svelte-1sdvd9m{position:fixed;left:50%;top:50%;width:calc(100vw - 4em);max-width:90%;max-height:calc(100vh - 6em);overflow:auto;transform:translate(-50%,-50%);padding:1em;border-radius:0.2em;background:white;z-index:10001}button.svelte-1sdvd9m{display:block}.modal-footer.svelte-1sdvd9m{margin-top:1em}");
    }

    const get_buttons_slot_changes = dirty => ({});
    const get_buttons_slot_context = ctx => ({});
    const get_header_slot_changes = dirty => ({});
    const get_header_slot_context = ctx => ({});

    function create_fragment$1(ctx) {
    	let div0;
    	let t0;
    	let div2;
    	let t1;
    	let t2;
    	let div1;
    	let t3;
    	let button;
    	let current;
    	let mounted;
    	let dispose;
    	const header_slot_template = /*#slots*/ ctx[5].header;
    	const header_slot = create_slot(header_slot_template, ctx, /*$$scope*/ ctx[4], get_header_slot_context);
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);
    	const buttons_slot_template = /*#slots*/ ctx[5].buttons;
    	const buttons_slot = create_slot(buttons_slot_template, ctx, /*$$scope*/ ctx[4], get_buttons_slot_context);

    	return {
    		c() {
    			div0 = element("div");
    			t0 = space();
    			div2 = element("div");
    			if (header_slot) header_slot.c();
    			t1 = space();
    			if (default_slot) default_slot.c();
    			t2 = space();
    			div1 = element("div");
    			if (buttons_slot) buttons_slot.c();
    			t3 = space();
    			button = element("button");
    			button.textContent = "Close";
    			attr(div0, "class", "modal-background svelte-1sdvd9m");
    			button.autofocus = true;
    			attr(button, "class", "svelte-1sdvd9m");
    			attr(div1, "class", "modal-footer svelte-1sdvd9m");
    			attr(div2, "class", "modal svelte-1sdvd9m");
    			attr(div2, "role", "dialog");
    			attr(div2, "aria-modal", "true");
    		},
    		m(target, anchor) {
    			insert(target, div0, anchor);
    			/*div0_binding*/ ctx[6](div0);
    			insert(target, t0, anchor);
    			insert(target, div2, anchor);

    			if (header_slot) {
    				header_slot.m(div2, null);
    			}

    			append(div2, t1);

    			if (default_slot) {
    				default_slot.m(div2, null);
    			}

    			append(div2, t2);
    			append(div2, div1);

    			if (buttons_slot) {
    				buttons_slot.m(div1, null);
    			}

    			append(div1, t3);
    			append(div1, button);
    			/*div2_binding*/ ctx[7](div2);
    			current = true;
    			button.focus();

    			if (!mounted) {
    				dispose = [
    					listen(window, "keydown", /*handle_keydown*/ ctx[3]),
    					listen(div0, "click", /*close*/ ctx[2]),
    					listen(div0, "keypress", /*handle_keydown*/ ctx[3]),
    					listen(button, "click", /*close*/ ctx[2])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (header_slot) {
    				if (header_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot_base(
    						header_slot,
    						header_slot_template,
    						ctx,
    						/*$$scope*/ ctx[4],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
    						: get_slot_changes(header_slot_template, /*$$scope*/ ctx[4], dirty, get_header_slot_changes),
    						get_header_slot_context
    					);
    				}
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[4],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null),
    						null
    					);
    				}
    			}

    			if (buttons_slot) {
    				if (buttons_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot_base(
    						buttons_slot,
    						buttons_slot_template,
    						ctx,
    						/*$$scope*/ ctx[4],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
    						: get_slot_changes(buttons_slot_template, /*$$scope*/ ctx[4], dirty, get_buttons_slot_changes),
    						get_buttons_slot_context
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(header_slot, local);
    			transition_in(default_slot, local);
    			transition_in(buttons_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(header_slot, local);
    			transition_out(default_slot, local);
    			transition_out(buttons_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div0);
    			/*div0_binding*/ ctx[6](null);
    			if (detaching) detach(t0);
    			if (detaching) detach(div2);
    			if (header_slot) header_slot.d(detaching);
    			if (default_slot) default_slot.d(detaching);
    			if (buttons_slot) buttons_slot.d(detaching);
    			/*div2_binding*/ ctx[7](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	const dispatch = createEventDispatcher();
    	const close = () => dispatch('close');
    	let modal;
    	let modal_background;

    	const handle_keydown = e => {
    		if (e.key === 'Escape') {
    			close();
    			return;
    		}

    		if (e.key === 'Tab') {
    			// trap focus
    			const nodes = modal.querySelectorAll('*');

    			const tabbable = Array.from(nodes).filter(n => n.tabIndex >= 0);
    			let index = tabbable.indexOf(document.activeElement);
    			if (index === -1 && e.shiftKey) index = 0;
    			index += tabbable.length + (e.shiftKey ? -1 : 1);
    			index %= tabbable.length;
    			tabbable[index].focus();
    			e.preventDefault();
    		}
    	};

    	const previously_focused = typeof document !== 'undefined' && document.activeElement;

    	if (previously_focused) {
    		onDestroy(() => {
    			previously_focused.focus();
    		});
    	}

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			modal_background = $$value;
    			$$invalidate(1, modal_background);
    		});
    	}

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			modal = $$value;
    			$$invalidate(0, modal);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	return [
    		modal,
    		modal_background,
    		close,
    		handle_keydown,
    		$$scope,
    		slots,
    		div0_binding,
    		div2_binding
    	];
    }

    class Modal extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {}, add_css$1);
    	}
    }

    /* src/App.svelte generated by Svelte v3.52.0 */

    function add_css(target) {
    	append_styles(target, "svelte-15xkphh", ".unordered-posts-alert.svelte-15xkphh{background-color:rgb(213, 57, 57);color:white;border-radius:50%;width:30px;height:30px;text-align:center;top:0;right:0;margin:0px 10px;font-size:15px;line-height:30px;cursor:pointer}.action-bar.svelte-15xkphh{display:flex;justify-content:left;flex-direction:row}");
    }

    // (61:8) {#if $unorderedPosts.length > 0}
    function create_if_block_2(ctx) {
    	let div;
    	let t_value = /*$unorderedPosts*/ ctx[3].length + "";
    	let t;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			t = text(t_value);
    			attr(div, "class", "unordered-posts-alert svelte-15xkphh");
    			attr(div, "alt", "Posts awaiting placement");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);

    			if (!mounted) {
    				dispose = listen(div, "click", /*click_handler*/ ctx[6]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*$unorderedPosts*/ 8 && t_value !== (t_value = /*$unorderedPosts*/ ctx[3].length + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (68:4) {#if show_unordered_modal}
    function create_if_block_1(ctx) {
    	let modal;
    	let current;

    	modal = new Modal({
    			props: {
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			}
    		});

    	modal.$on("close", /*close_handler*/ ctx[8]);

    	return {
    		c() {
    			create_component(modal.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const modal_changes = {};

    			if (dirty & /*$$scope, frontpage_id*/ 32769) {
    				modal_changes.$$scope = { dirty, ctx };
    			}

    			modal.$set(modal_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    }

    // (69:4) <Modal on:close="{() => show_unordered_modal = false}">
    function create_default_slot_1(ctx) {
    	let h2;
    	let t1;
    	let addposttable;
    	let current;

    	addposttable = new AddPostTable({
    			props: {
    				frontpage_id: /*frontpage_id*/ ctx[0],
    				type: "unordered"
    			}
    		});

    	addposttable.$on("updated", /*updated*/ ctx[4]);

    	return {
    		c() {
    			h2 = element("h2");
    			h2.textContent = "Posts awaiting placement";
    			t1 = space();
    			create_component(addposttable.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h2, anchor);
    			insert(target, t1, anchor);
    			mount_component(addposttable, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const addposttable_changes = {};
    			if (dirty & /*frontpage_id*/ 1) addposttable_changes.frontpage_id = /*frontpage_id*/ ctx[0];
    			addposttable.$set(addposttable_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(addposttable.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(addposttable.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h2);
    			if (detaching) detach(t1);
    			destroy_component(addposttable, detaching);
    		}
    	};
    }

    // (74:4) {#if show_modal}
    function create_if_block(ctx) {
    	let modal;
    	let current;

    	modal = new Modal({
    			props: {
    				$$slots: {
    					header: [create_header_slot],
    					default: [create_default_slot]
    				},
    				$$scope: { ctx }
    			}
    		});

    	modal.$on("close", /*close_handler_1*/ ctx[9]);

    	return {
    		c() {
    			create_component(modal.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const modal_changes = {};

    			if (dirty & /*$$scope, frontpage_id*/ 32769) {
    				modal_changes.$$scope = { dirty, ctx };
    			}

    			modal.$set(modal_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    }

    // (75:4) <Modal on:close="{() => show_modal = false}">
    function create_default_slot(ctx) {
    	let addposttable;
    	let current;

    	addposttable = new AddPostTable({
    			props: { frontpage_id: /*frontpage_id*/ ctx[0] }
    		});

    	addposttable.$on("updated", /*updated*/ ctx[4]);

    	return {
    		c() {
    			create_component(addposttable.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(addposttable, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const addposttable_changes = {};
    			if (dirty & /*frontpage_id*/ 1) addposttable_changes.frontpage_id = /*frontpage_id*/ ctx[0];
    			addposttable.$set(addposttable_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(addposttable.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(addposttable.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(addposttable, detaching);
    		}
    	};
    }

    // (76:8) 
    function create_header_slot(ctx) {
    	let h2;

    	return {
    		c() {
    			h2 = element("h2");
    			h2.textContent = "Add Posts";
    			attr(h2, "slot", "header");
    		},
    		m(target, anchor) {
    			insert(target, h2, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(h2);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let main;
    	let div;
    	let t0;
    	let a;
    	let t2;
    	let hr;
    	let t3;
    	let t4;
    	let t5;
    	let frontpagetable;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*$unorderedPosts*/ ctx[3].length > 0 && create_if_block_2(ctx);
    	let if_block1 = /*show_unordered_modal*/ ctx[2] && create_if_block_1(ctx);
    	let if_block2 = /*show_modal*/ ctx[1] && create_if_block(ctx);

    	frontpagetable = new FrontpageTable({
    			props: { frontpage_id: /*frontpage_id*/ ctx[0] }
    		});

    	frontpagetable.$on("updated", /*updated*/ ctx[4]);

    	return {
    		c() {
    			main = element("main");
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			a = element("a");
    			a.textContent = "Add posts";
    			t2 = space();
    			hr = element("hr");
    			t3 = space();
    			if (if_block1) if_block1.c();
    			t4 = space();
    			if (if_block2) if_block2.c();
    			t5 = space();
    			create_component(frontpagetable.$$.fragment);
    			attr(a, "href", "#show-modal");
    			attr(a, "class", "button button-primary");
    			attr(div, "class", "action-bar svelte-15xkphh");
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);
    			append(main, div);
    			if (if_block0) if_block0.m(div, null);
    			append(div, t0);
    			append(div, a);
    			append(main, t2);
    			append(main, hr);
    			append(main, t3);
    			if (if_block1) if_block1.m(main, null);
    			append(main, t4);
    			if (if_block2) if_block2.m(main, null);
    			append(main, t5);
    			mount_component(frontpagetable, main, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen(a, "click", /*click_handler_1*/ ctx[7]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (/*$unorderedPosts*/ ctx[3].length > 0) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(div, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*show_unordered_modal*/ ctx[2]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*show_unordered_modal*/ 4) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_1(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(main, t4);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*show_modal*/ ctx[1]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*show_modal*/ 2) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(main, t5);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			const frontpagetable_changes = {};
    			if (dirty & /*frontpage_id*/ 1) frontpagetable_changes.frontpage_id = /*frontpage_id*/ ctx[0];
    			frontpagetable.$set(frontpagetable_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block1);
    			transition_in(if_block2);
    			transition_in(frontpagetable.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block1);
    			transition_out(if_block2);
    			transition_out(frontpagetable.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(main);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			destroy_component(frontpagetable);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let $featuredPosts;
    	let $unorderedPosts;
    	component_subscribe($$self, featuredPosts, $$value => $$invalidate(11, $featuredPosts = $$value));
    	component_subscribe($$self, unorderedPosts, $$value => $$invalidate(3, $unorderedPosts = $$value));
    	let { frontpage_id } = $$props;
    	let { url } = $$props;
    	let show_modal = false;
    	let show_unordered_modal = false;
    	let socket = null;

    	onMount(async () => {
    		socket = new FrontPageEngineSocketServer(url);
    		socket.subscribe(`frontpage-${frontpage_id}`);
    		socket.on("frontpage_updated", getPosts);
    		await getPosts();
    		await getUnorderedPosts();
    		setInterval(getUnorderedPosts, 60000);
    	});

    	onDestroy(() => {
    		socket.close();
    	});

    	const getPosts = async () => {
    		const wp_posts = await wp_api_post("frontpage_engine_fetch_posts", { id: frontpage_id });
    		set_store_value(featuredPosts, $featuredPosts = wp_posts.map(map_posts), $featuredPosts);
    	};

    	const getUnorderedPosts = async () => {
    		const wp_posts = await wp_api_post("frontpage_engine_fetch_unordered_posts", { id: frontpage_id });
    		set_store_value(unorderedPosts, $unorderedPosts = wp_posts.map(map_posts), $unorderedPosts);
    	};

    	const updatePosts = async () => {
    		await wp_api_post("frontpage_engine_order_posts", {
    			id: frontpage_id,
    			"order[]": $featuredPosts.map(post => post.id)
    		});
    	};

    	const updated = async () => {
    		console.log("updated");
    		await updatePosts();

    		socket.sendMessage({
    			name: "frontpage_updated",
    			message: "Updated front page"
    		});
    	};

    	const click_handler = () => $$invalidate(2, show_unordered_modal = true);
    	const click_handler_1 = () => $$invalidate(1, show_modal = true);
    	const close_handler = () => $$invalidate(2, show_unordered_modal = false);
    	const close_handler_1 = () => $$invalidate(1, show_modal = false);

    	$$self.$$set = $$props => {
    		if ('frontpage_id' in $$props) $$invalidate(0, frontpage_id = $$props.frontpage_id);
    		if ('url' in $$props) $$invalidate(5, url = $$props.url);
    	};

    	return [
    		frontpage_id,
    		show_modal,
    		show_unordered_modal,
    		$unorderedPosts,
    		updated,
    		url,
    		click_handler,
    		click_handler_1,
    		close_handler,
    		close_handler_1
    	];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, { frontpage_id: 0, url: 5 }, add_css);
    	}
    }

    const app = new App({
        target: document.getElementById('frontpage-engine-app'),
        props: {
            featured_code: ajax_var.featured_code,
            ordering_code: ajax_var.ordering_code,
            nonce: ajax_var.nonce,
            url: ajax_var.url,
            action: ajax_var.action,
            frontpage_id: ajax_var.frontpage_id,
        }
    });

    return app;

})();
//# sourceMappingURL=frontpage_engine.js.map
