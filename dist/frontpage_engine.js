var frontpage_engine = (function () {
    'use strict';

    class FrontPageEngineSocketServer {
        constructor(domain = "http://localhost", channel = "default") {
            this.domain = domain;
            this.channel = channel;
            this.connect();
            this.callbacks = [];
            this.me = null;
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
            // console.log({ data: message.data });
            const data = JSON.parse(message.data);
            Promise.all(this.callbacks.map(callback => {
                if (callback.name === data.name) {
                    // console.log("Calling callback", callback.name);
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
            // console.log("Sending message", message);
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
            // console.log(message);
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
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
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        select.selectedIndex = -1; // no option should be selected
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
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

    const featuredPosts = writable([]);
    const unfeaturedPosts = writable([]);
    const unorderedPosts = writable([]);
    const totalHits = writable(0);
    const analytics = writable([]);

    /* src/components/Pie.svelte generated by Svelte v3.52.0 */

    function create_fragment$7(ctx) {
    	let svg;
    	let circle0;
    	let circle1;
    	let circle1_r_value;

    	return {
    		c() {
    			svg = svg_element("svg");
    			circle0 = svg_element("circle");
    			circle1 = svg_element("circle");
    			attr(circle0, "r", /*radius*/ ctx[3]);
    			attr(circle0, "cx", /*radius*/ ctx[3]);
    			attr(circle0, "cy", /*radius*/ ctx[3]);
    			attr(circle0, "fill", /*bgColor*/ ctx[1]);
    			attr(circle1, "r", circle1_r_value = /*radius*/ ctx[3] / 2);
    			attr(circle1, "cx", /*radius*/ ctx[3]);
    			attr(circle1, "cy", /*radius*/ ctx[3]);
    			attr(circle1, "fill", /*bgColor*/ ctx[1]);
    			attr(circle1, "stroke", /*fgColor*/ ctx[2]);
    			attr(circle1, "stroke-width", /*radius*/ ctx[3]);
    			attr(circle1, "stroke-dasharray", /*dashArray*/ ctx[4]);
    			attr(svg, "width", /*size*/ ctx[0]);
    			attr(svg, "height", /*size*/ ctx[0]);
    			attr(svg, "viewBox", /*viewBox*/ ctx[5]);
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, circle0);
    			append(svg, circle1);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*radius*/ 8) {
    				attr(circle0, "r", /*radius*/ ctx[3]);
    			}

    			if (dirty & /*radius*/ 8) {
    				attr(circle0, "cx", /*radius*/ ctx[3]);
    			}

    			if (dirty & /*radius*/ 8) {
    				attr(circle0, "cy", /*radius*/ ctx[3]);
    			}

    			if (dirty & /*bgColor*/ 2) {
    				attr(circle0, "fill", /*bgColor*/ ctx[1]);
    			}

    			if (dirty & /*radius*/ 8 && circle1_r_value !== (circle1_r_value = /*radius*/ ctx[3] / 2)) {
    				attr(circle1, "r", circle1_r_value);
    			}

    			if (dirty & /*radius*/ 8) {
    				attr(circle1, "cx", /*radius*/ ctx[3]);
    			}

    			if (dirty & /*radius*/ 8) {
    				attr(circle1, "cy", /*radius*/ ctx[3]);
    			}

    			if (dirty & /*bgColor*/ 2) {
    				attr(circle1, "fill", /*bgColor*/ ctx[1]);
    			}

    			if (dirty & /*fgColor*/ 4) {
    				attr(circle1, "stroke", /*fgColor*/ ctx[2]);
    			}

    			if (dirty & /*radius*/ 8) {
    				attr(circle1, "stroke-width", /*radius*/ ctx[3]);
    			}

    			if (dirty & /*dashArray*/ 16) {
    				attr(circle1, "stroke-dasharray", /*dashArray*/ ctx[4]);
    			}

    			if (dirty & /*size*/ 1) {
    				attr(svg, "width", /*size*/ ctx[0]);
    			}

    			if (dirty & /*size*/ 1) {
    				attr(svg, "height", /*size*/ ctx[0]);
    			}

    			if (dirty & /*viewBox*/ 32) {
    				attr(svg, "viewBox", /*viewBox*/ ctx[5]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(svg);
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let viewBox;
    	let radius;
    	let halfCircumference;
    	let pieSize;
    	let dashArray;
    	let { size = 200 } = $$props;
    	let { percent = 0 } = $$props;
    	let { bgColor = 'cornflowerblue' } = $$props;
    	let { fgColor = 'orange' } = $$props;

    	$$self.$$set = $$props => {
    		if ('size' in $$props) $$invalidate(0, size = $$props.size);
    		if ('percent' in $$props) $$invalidate(6, percent = $$props.percent);
    		if ('bgColor' in $$props) $$invalidate(1, bgColor = $$props.bgColor);
    		if ('fgColor' in $$props) $$invalidate(2, fgColor = $$props.fgColor);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*size*/ 1) {
    			$$invalidate(5, viewBox = `0 0 ${size} ${size}`);
    		}

    		if ($$self.$$.dirty & /*size*/ 1) {
    			$$invalidate(3, radius = size / 2);
    		}

    		if ($$self.$$.dirty & /*radius*/ 8) {
    			$$invalidate(8, halfCircumference = Math.PI * radius);
    		}

    		if ($$self.$$.dirty & /*halfCircumference, percent*/ 320) {
    			$$invalidate(7, pieSize = halfCircumference * (percent / 100));
    		}

    		if ($$self.$$.dirty & /*halfCircumference, pieSize*/ 384) {
    			$$invalidate(4, dashArray = `0 ${halfCircumference - pieSize} ${pieSize}`);
    		}
    	};

    	return [
    		size,
    		bgColor,
    		fgColor,
    		radius,
    		dashArray,
    		viewBox,
    		percent,
    		pieSize,
    		halfCircumference
    	];
    }

    class Pie extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {
    			size: 0,
    			percent: 6,
    			bgColor: 1,
    			fgColor: 2
    		});
    	}
    }

    /* src/components/AnalyticsGraph.svelte generated by Svelte v3.52.0 */

    function add_css$5(target) {
    	append_styles(target, "svelte-j0cm0n", ".analytics-graph.svelte-j0cm0n{display:flex;flex-direction:column;justify-content:flex-start;align-items:center}");
    }

    // (15:0) {#if (hits_last_hour !== null)}
    function create_if_block$4(ctx) {
    	let div;
    	let pie;
    	let t0;
    	let t1_value = Number(/*hits_last_hour*/ ctx[0]).toLocaleString() + "";
    	let t1;
    	let current;

    	pie = new Pie({
    			props: {
    				size: height,
    				percent: /*hits_last_hour*/ ctx[0] / /*$totalHits*/ ctx[1] * 100
    			}
    		});

    	return {
    		c() {
    			div = element("div");
    			create_component(pie.$$.fragment);
    			t0 = space();
    			t1 = text(t1_value);
    			attr(div, "class", "analytics-graph svelte-j0cm0n");
    			set_style(div, "height", height + "px");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(pie, div, null);
    			append(div, t0);
    			append(div, t1);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const pie_changes = {};
    			if (dirty & /*hits_last_hour, $totalHits*/ 3) pie_changes.percent = /*hits_last_hour*/ ctx[0] / /*$totalHits*/ ctx[1] * 100;
    			pie.$set(pie_changes);
    			if ((!current || dirty & /*hits_last_hour*/ 1) && t1_value !== (t1_value = Number(/*hits_last_hour*/ ctx[0]).toLocaleString() + "")) set_data(t1, t1_value);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(pie.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(pie.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(pie);
    		}
    	};
    }

    function create_fragment$6(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*hits_last_hour*/ ctx[0] !== null && create_if_block$4(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*hits_last_hour*/ ctx[0] !== null) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*hits_last_hour*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$4(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    const height = 60;

    function instance$6($$self, $$props, $$invalidate) {
    	let $totalHits;
    	component_subscribe($$self, totalHits, $$value => $$invalidate(1, $totalHits = $$value));
    	let { hits_last_hour } = $$props;

    	$$self.$$set = $$props => {
    		if ('hits_last_hour' in $$props) $$invalidate(0, hits_last_hour = $$props.hits_last_hour);
    	};

    	return [hits_last_hour, $totalHits];
    }

    class AnalyticsGraph extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { hits_last_hour: 0 }, add_css$5);
    	}
    }

    /* src/components/PostRow.svelte generated by Svelte v3.52.0 */

    function add_css$4(target) {
    	append_styles(target, "svelte-1w5zk1b", ".column-image.svelte-1w5zk1b.svelte-1w5zk1b{width:50px}.column-image.svelte-1w5zk1b img.svelte-1w5zk1b{width:50px;height:40px;object-fit:cover}");
    }

    // (9:4) {#if post.image}
    function create_if_block_2$2(ctx) {
    	let img;
    	let img_src_value;
    	let img_alt_value;

    	return {
    		c() {
    			img = element("img");
    			attr(img, "class", "image column-image svelte-1w5zk1b");
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

    // (13:0) {#if (mode=="development")}
    function create_if_block_1$2(ctx) {
    	let td0;
    	let t0_value = /*post*/ ctx[0].slot?.id + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*post*/ ctx[0].id + "";
    	let t2;
    	let t3;
    	let td2;
    	let t4_value = /*post*/ ctx[0].slot?.display_order + "";
    	let t4;

    	return {
    		c() {
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			t4 = text(t4_value);
    		},
    		m(target, anchor) {
    			insert(target, td0, anchor);
    			append(td0, t0);
    			insert(target, t1, anchor);
    			insert(target, td1, anchor);
    			append(td1, t2);
    			insert(target, t3, anchor);
    			insert(target, td2, anchor);
    			append(td2, t4);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*post*/ 1 && t0_value !== (t0_value = /*post*/ ctx[0].slot?.id + "")) set_data(t0, t0_value);
    			if (dirty & /*post*/ 1 && t2_value !== (t2_value = /*post*/ ctx[0].id + "")) set_data(t2, t2_value);
    			if (dirty & /*post*/ 1 && t4_value !== (t4_value = /*post*/ ctx[0].slot?.display_order + "")) set_data(t4, t4_value);
    		},
    		d(detaching) {
    			if (detaching) detach(td0);
    			if (detaching) detach(t1);
    			if (detaching) detach(td1);
    			if (detaching) detach(t3);
    			if (detaching) detach(td2);
    		}
    	};
    }

    // (26:4) {#if $analytics.find(analytic => post.id === analytic.post_id)}
    function create_if_block$3(ctx) {
    	let analyticsgraph;
    	let current;

    	analyticsgraph = new AnalyticsGraph({
    			props: {
    				hits_last_hour: /*$analytics*/ ctx[1].find(/*func_1*/ ctx[4]).hits_last_hour
    			}
    		});

    	return {
    		c() {
    			create_component(analyticsgraph.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(analyticsgraph, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const analyticsgraph_changes = {};
    			if (dirty & /*$analytics, post*/ 3) analyticsgraph_changes.hits_last_hour = /*$analytics*/ ctx[1].find(/*func_1*/ ctx[4]).hits_last_hour;
    			analyticsgraph.$set(analyticsgraph_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(analyticsgraph.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(analyticsgraph.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(analyticsgraph, detaching);
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	let td0;
    	let t0;
    	let t1;
    	let td1;
    	let strong;
    	let a;
    	let t2_value = /*post*/ ctx[0].title + "";
    	let t2;
    	let a_href_value;
    	let t3;
    	let td2;
    	let t4_value = /*post*/ ctx[0].author + "";
    	let t4;
    	let t5;
    	let td3;
    	let t6_value = /*post*/ ctx[0].date_published + "";
    	let t6;
    	let t7;
    	let td4;
    	let show_if = /*$analytics*/ ctx[1].find(/*func*/ ctx[3]);
    	let current;
    	let if_block0 = /*post*/ ctx[0].image && create_if_block_2$2(ctx);
    	let if_block1 = /*mode*/ ctx[2] == "development" && create_if_block_1$2(ctx);
    	let if_block2 = show_if && create_if_block$3(ctx);

    	return {
    		c() {
    			td0 = element("td");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			td1 = element("td");
    			strong = element("strong");
    			a = element("a");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			td3 = element("td");
    			t6 = text(t6_value);
    			t7 = space();
    			td4 = element("td");
    			if (if_block2) if_block2.c();
    			attr(td0, "class", "column-image svelte-1w5zk1b");
    			attr(a, "class", "row-title");
    			attr(a, "href", a_href_value = /*post*/ ctx[0].link);
    			attr(td1, "class", "column-title");
    			attr(td2, "class", "column-author");
    			attr(td3, "class", "column-published");
    			attr(td4, "class", "column-analytics");
    		},
    		m(target, anchor) {
    			insert(target, td0, anchor);
    			if (if_block0) if_block0.m(td0, null);
    			insert(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, t1, anchor);
    			insert(target, td1, anchor);
    			append(td1, strong);
    			append(strong, a);
    			append(a, t2);
    			insert(target, t3, anchor);
    			insert(target, td2, anchor);
    			append(td2, t4);
    			insert(target, t5, anchor);
    			insert(target, td3, anchor);
    			append(td3, t6);
    			insert(target, t7, anchor);
    			insert(target, td4, anchor);
    			if (if_block2) if_block2.m(td4, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*post*/ ctx[0].image) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2$2(ctx);
    					if_block0.c();
    					if_block0.m(td0, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*mode*/ ctx[2] == "development") if_block1.p(ctx, dirty);
    			if ((!current || dirty & /*post*/ 1) && t2_value !== (t2_value = /*post*/ ctx[0].title + "")) set_data(t2, t2_value);

    			if (!current || dirty & /*post*/ 1 && a_href_value !== (a_href_value = /*post*/ ctx[0].link)) {
    				attr(a, "href", a_href_value);
    			}

    			if ((!current || dirty & /*post*/ 1) && t4_value !== (t4_value = /*post*/ ctx[0].author + "")) set_data(t4, t4_value);
    			if ((!current || dirty & /*post*/ 1) && t6_value !== (t6_value = /*post*/ ctx[0].date_published + "")) set_data(t6, t6_value);
    			if (dirty & /*$analytics, post*/ 3) show_if = /*$analytics*/ ctx[1].find(/*func*/ ctx[3]);

    			if (show_if) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*$analytics, post*/ 3) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block$3(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(td4, null);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block2);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block2);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(td0);
    			if (if_block0) if_block0.d();
    			if (detaching) detach(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach(t1);
    			if (detaching) detach(td1);
    			if (detaching) detach(t3);
    			if (detaching) detach(td2);
    			if (detaching) detach(t5);
    			if (detaching) detach(td3);
    			if (detaching) detach(t7);
    			if (detaching) detach(td4);
    			if (if_block2) if_block2.d();
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $analytics;
    	component_subscribe($$self, analytics, $$value => $$invalidate(1, $analytics = $$value));
    	const mode = "development";
    	let { post } = $$props;
    	const func = analytic => post.id === analytic.post_id;
    	const func_1 = analytic => post.id === analytic.post_id;

    	$$self.$$set = $$props => {
    		if ('post' in $$props) $$invalidate(0, post = $$props.post);
    	};

    	return [post, $analytics, mode, func, func_1];
    }

    class PostRow extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { post: 0 }, add_css$4);
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

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    function __generator(thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    }

    var wp = window.wp;
    function apiPost(path, data) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            wp.apiRequest({
                path: path,
                data: data,
                type: "POST"
            })
                .done(function (response) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (response.error) {
                        reject(response);
                    }
                    resolve(response);
                    return [2 /*return*/];
                });
            }); })
                .fail(function (response) { return __awaiter(_this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    reject(((_a = response.responseJSON) === null || _a === void 0 ? void 0 : _a.message) || response.statusText || response.responseText || response);
                    return [2 /*return*/];
                });
            }); });
        });
    }
    function apiGet(path) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            wp.apiRequest({
                path: path,
                type: "GET"
            })
                .done(function (response) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (response.error) {
                        reject(response);
                    }
                    resolve(response);
                    return [2 /*return*/];
                });
            }); })
                .fail(function (response) { return __awaiter(_this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    reject(((_a = response.responseJSON) === null || _a === void 0 ? void 0 : _a.message) || response.statusText || response.responseText || response);
                    return [2 /*return*/];
                });
            }); });
        });
    }

    const map_posts = (post) => {
        return {
            id: post.id || post.ID || post.slot?.post_id || `slot-${post.slot?.id}`,
            title: post.post_title,
            author: post.post_author,
            date_published: post.post_date,
            type: post.post_type,
            image: post.image,
            order: post.menu_order,
            slot: post.slot,
            locked: !!(post.slot?.lock_until),
            analytics: post.analytics || {},
        }
    };

    /* src/components/FrontpageTable.svelte generated by Svelte v3.52.0 */

    function add_css$3(target) {
    	append_styles(target, "svelte-16uhaqm", "table.svelte-16uhaqm{border-collapse:collapse}table.is-updating.svelte-16uhaqm{opacity:0.5;pointer-events:none}tr.is-active.svelte-16uhaqm{background-color:rgb(204, 204, 204) !important}tr.is-locked.svelte-16uhaqm{background-color:rgb(250, 232, 238) !important}.column-header-image.svelte-16uhaqm{width:50px}.column-header-title.svelte-16uhaqm{width:500px}.dot-underline.svelte-16uhaqm{text-decoration:underline dotted;cursor:pointer}");
    }

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	child_ctx[19] = list;
    	child_ctx[20] = i;
    	return child_ctx;
    }

    // (148:12) {#if (mode === "development")}
    function create_if_block_3$1(ctx) {
    	let th0;
    	let t1;
    	let th1;
    	let t3;
    	let th2;

    	return {
    		c() {
    			th0 = element("th");
    			th0.textContent = "Slot ID";
    			t1 = space();
    			th1 = element("th");
    			th1.textContent = "Post ID";
    			t3 = space();
    			th2 = element("th");
    			th2.textContent = "Display Order";
    			attr(th0, "scope", "col");
    			attr(th0, "class", "manage-column");
    			attr(th1, "scope", "col");
    			attr(th1, "class", "manage-column");
    			attr(th2, "scope", "col");
    			attr(th2, "class", "manage-column");
    		},
    		m(target, anchor) {
    			insert(target, th0, anchor);
    			insert(target, t1, anchor);
    			insert(target, th1, anchor);
    			insert(target, t3, anchor);
    			insert(target, th2, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(th0);
    			if (detaching) detach(t1);
    			if (detaching) detach(th1);
    			if (detaching) detach(t3);
    			if (detaching) detach(th2);
    		}
    	};
    }

    // (174:16) {#if (!post.locked && !!post.slot.post_id)}
    function create_if_block_2$1(ctx) {
    	let label;
    	let t1;
    	let input;
    	let mounted;
    	let dispose;

    	function input_change_handler() {
    		/*input_change_handler*/ ctx[12].call(input, /*each_value*/ ctx[19], /*index*/ ctx[20]);
    	}

    	return {
    		c() {
    			label = element("label");
    			label.textContent = "Select";
    			t1 = space();
    			input = element("input");
    			attr(label, "class", "screen-reader-text");
    			attr(label, "for", "cb-select-1");
    			attr(input, "class", "cb-select-1");
    			attr(input, "type", "checkbox");
    		},
    		m(target, anchor) {
    			insert(target, label, anchor);
    			insert(target, t1, anchor);
    			insert(target, input, anchor);
    			input.checked = /*post*/ ctx[18].checked;

    			if (!mounted) {
    				dispose = listen(input, "change", input_change_handler);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*$featuredPosts*/ 4) {
    				input.checked = /*post*/ ctx[18].checked;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(label);
    			if (detaching) detach(t1);
    			if (detaching) detach(input);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (184:16) {#if (!!post.slot.post_id)}
    function create_if_block$2(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*post*/ ctx[18].locked) return create_if_block_1$1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (189:20) {:else}
    function create_else_block(ctx) {
    	let span0;
    	let t;
    	let span1;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			span0 = element("span");
    			t = space();
    			span1 = element("span");
    			attr(span0, "class", "dashicons dashicons-unlock");
    			attr(span1, "class", "dashicons dashicons-trash");
    		},
    		m(target, anchor) {
    			insert(target, span0, anchor);
    			insert(target, t, anchor);
    			insert(target, span1, anchor);

    			if (!mounted) {
    				dispose = [
    					listen(span0, "click", function () {
    						if (is_function(/*doLock*/ ctx[6](/*post*/ ctx[18]))) /*doLock*/ ctx[6](/*post*/ ctx[18]).apply(this, arguments);
    					}),
    					listen(span1, "click", function () {
    						if (is_function(/*doRemove*/ ctx[9](/*post*/ ctx[18]))) /*doRemove*/ ctx[9](/*post*/ ctx[18]).apply(this, arguments);
    					})
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d(detaching) {
    			if (detaching) detach(span0);
    			if (detaching) detach(t);
    			if (detaching) detach(span1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (185:20) {#if (post.locked)}
    function create_if_block_1$1(ctx) {
    	let span0;
    	let t0;
    	let span1;
    	let t1_value = /*formatTime*/ ctx[11](/*post*/ ctx[18].slot.lock_until) + "";
    	let t1;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			span0 = element("span");
    			t0 = space();
    			span1 = element("span");
    			t1 = text(t1_value);
    			attr(span0, "class", "dashicons dashicons-lock");
    			attr(span1, "class", "dot-underline svelte-16uhaqm");
    		},
    		m(target, anchor) {
    			insert(target, span0, anchor);
    			insert(target, t0, anchor);
    			insert(target, span1, anchor);
    			append(span1, t1);

    			if (!mounted) {
    				dispose = [
    					listen(span0, "click", function () {
    						if (is_function(/*doUnlock*/ ctx[8](/*post*/ ctx[18]))) /*doUnlock*/ ctx[8](/*post*/ ctx[18]).apply(this, arguments);
    					}),
    					listen(span1, "click", function () {
    						if (is_function(/*chooseTime*/ ctx[7](/*post*/ ctx[18]))) /*chooseTime*/ ctx[7](/*post*/ ctx[18]).apply(this, arguments);
    					}),
    					listen(span1, "keypress", function () {
    						if (is_function(/*chooseTime*/ ctx[7](/*post*/ ctx[18]))) /*chooseTime*/ ctx[7](/*post*/ ctx[18]).apply(this, arguments);
    					})
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*$featuredPosts*/ 4 && t1_value !== (t1_value = /*formatTime*/ ctx[11](/*post*/ ctx[18].slot.lock_until) + "")) set_data(t1, t1_value);
    		},
    		d(detaching) {
    			if (detaching) detach(span0);
    			if (detaching) detach(t0);
    			if (detaching) detach(span1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (161:8) {#each $featuredPosts as post, index (post.id)}
    function create_each_block$2(key_1, ctx) {
    	let tr;
    	let th0;
    	let t0;
    	let postrow;
    	let t1;
    	let th1;
    	let t2;
    	let tr_id_value;
    	let tr_draggable_value;
    	let rect;
    	let stop_animation = noop;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = !/*post*/ ctx[18].locked && !!/*post*/ ctx[18].slot.post_id && create_if_block_2$1(ctx);

    	postrow = new PostRow({
    			props: {
    				post: /*post*/ ctx[18],
    				index: /*index*/ ctx[20]
    			}
    		});

    	let if_block1 = !!/*post*/ ctx[18].slot.post_id && create_if_block$2(ctx);

    	function dragstart_handler(...args) {
    		return /*dragstart_handler*/ ctx[13](/*index*/ ctx[20], ...args);
    	}

    	function drop_handler(...args) {
    		return /*drop_handler*/ ctx[14](/*index*/ ctx[20], ...args);
    	}

    	function dragenter_handler() {
    		return /*dragenter_handler*/ ctx[15](/*post*/ ctx[18], /*index*/ ctx[20]);
    	}

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			tr = element("tr");
    			th0 = element("th");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			create_component(postrow.$$.fragment);
    			t1 = space();
    			th1 = element("th");
    			if (if_block1) if_block1.c();
    			t2 = space();
    			attr(th0, "scope", "row");
    			attr(th0, "class", "check-column");
    			attr(th1, "scope", "row");
    			attr(th1, "class", "lock-column");
    			attr(tr, "id", tr_id_value = "post-" + /*post*/ ctx[18].id);
    			attr(tr, "draggable", tr_draggable_value = !/*post*/ ctx[18].locked && !!/*post*/ ctx[18].slot.post_id);
    			attr(tr, "ondragover", "return false");
    			attr(tr, "class", "svelte-16uhaqm");
    			toggle_class(tr, "is-active", /*hovering*/ ctx[1] === /*index*/ ctx[20]);
    			toggle_class(tr, "is-locked", /*post*/ ctx[18].locked);
    			this.first = tr;
    		},
    		m(target, anchor) {
    			insert(target, tr, anchor);
    			append(tr, th0);
    			if (if_block0) if_block0.m(th0, null);
    			append(tr, t0);
    			mount_component(postrow, tr, null);
    			append(tr, t1);
    			append(tr, th1);
    			if (if_block1) if_block1.m(th1, null);
    			append(tr, t2);
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

    			if (!/*post*/ ctx[18].locked && !!/*post*/ ctx[18].slot.post_id) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2$1(ctx);
    					if_block0.c();
    					if_block0.m(th0, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			const postrow_changes = {};
    			if (dirty & /*$featuredPosts*/ 4) postrow_changes.post = /*post*/ ctx[18];
    			if (dirty & /*$featuredPosts*/ 4) postrow_changes.index = /*index*/ ctx[20];
    			postrow.$set(postrow_changes);

    			if (!!/*post*/ ctx[18].slot.post_id) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$2(ctx);
    					if_block1.c();
    					if_block1.m(th1, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (!current || dirty & /*$featuredPosts*/ 4 && tr_id_value !== (tr_id_value = "post-" + /*post*/ ctx[18].id)) {
    				attr(tr, "id", tr_id_value);
    			}

    			if (!current || dirty & /*$featuredPosts*/ 4 && tr_draggable_value !== (tr_draggable_value = !/*post*/ ctx[18].locked && !!/*post*/ ctx[18].slot.post_id)) {
    				attr(tr, "draggable", tr_draggable_value);
    			}

    			if (!current || dirty & /*hovering, $featuredPosts*/ 6) {
    				toggle_class(tr, "is-active", /*hovering*/ ctx[1] === /*index*/ ctx[20]);
    			}

    			if (!current || dirty & /*$featuredPosts*/ 4) {
    				toggle_class(tr, "is-locked", /*post*/ ctx[18].locked);
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
    			if (if_block0) if_block0.d();
    			destroy_component(postrow);
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$4(ctx) {
    	let table;
    	let thead;
    	let tr;
    	let td;
    	let label;
    	let t1;
    	let input;
    	let t2;
    	let th0;
    	let t4;
    	let t5;
    	let th1;
    	let t7;
    	let th2;
    	let t9;
    	let th3;
    	let t11;
    	let th4;
    	let t12;
    	let th5;
    	let t13;
    	let tbody;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let table_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*mode*/ ctx[3] === "development" && create_if_block_3$1();
    	let each_value = /*$featuredPosts*/ ctx[2];
    	const get_key = ctx => /*post*/ ctx[18].id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$2(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
    	}

    	return {
    		c() {
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");
    			td = element("td");
    			label = element("label");
    			label.textContent = "Select All";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			th0 = element("th");
    			th0.textContent = "Image";
    			t4 = space();
    			if (if_block) if_block.c();
    			t5 = space();
    			th1 = element("th");
    			th1.textContent = "Title";
    			t7 = space();
    			th2 = element("th");
    			th2.textContent = "Author";
    			t9 = space();
    			th3 = element("th");
    			th3.textContent = "Published";
    			t11 = space();
    			th4 = element("th");
    			t12 = space();
    			th5 = element("th");
    			t13 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(label, "class", "screen-reader-text");
    			attr(label, "for", "");
    			attr(input, "class", "");
    			attr(input, "type", "checkbox");
    			attr(td, "class", "manage-column check-column");
    			attr(th0, "scope", "col");
    			attr(th0, "class", "column-header-image svelte-16uhaqm");
    			attr(th1, "scope", "col");
    			attr(th1, "class", "column-header-title svelte-16uhaqm");
    			attr(th2, "scope", "col");
    			attr(th2, "class", "manage-column");
    			attr(th3, "scope", "col");
    			attr(th3, "class", "manage-column");
    			attr(th4, "scope", "col");
    			attr(th4, "class", "manage-column");
    			attr(th5, "scope", "col");
    			attr(th5, "class", "manage-column");
    			attr(table, "class", table_class_value = "wp-list-table widefat fixed striped table-view-list featuredposts " + (/*updating*/ ctx[0] ? "is-updating" : "") + " svelte-16uhaqm");
    		},
    		m(target, anchor) {
    			insert(target, table, anchor);
    			append(table, thead);
    			append(thead, tr);
    			append(tr, td);
    			append(td, label);
    			append(td, t1);
    			append(td, input);
    			append(tr, t2);
    			append(tr, th0);
    			append(tr, t4);
    			if (if_block) if_block.m(tr, null);
    			append(tr, t5);
    			append(tr, th1);
    			append(tr, t7);
    			append(tr, th2);
    			append(tr, t9);
    			append(tr, th3);
    			append(tr, t11);
    			append(tr, th4);
    			append(tr, t12);
    			append(tr, th5);
    			append(table, t13);
    			append(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen(input, "change", /*checkAll*/ ctx[10]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*$featuredPosts, hovering, dragStart, dragDrop, chooseTime, formatTime, doUnlock, doRemove, doLock*/ 3062) {
    				each_value = /*$featuredPosts*/ ctx[2];
    				group_outros();
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, tbody, fix_and_outro_and_destroy_block, create_each_block$2, null, get_each_context$2);
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].a();
    				check_outros();
    			}

    			if (!current || dirty & /*updating*/ 1 && table_class_value !== (table_class_value = "wp-list-table widefat fixed striped table-view-list featuredposts " + (/*updating*/ ctx[0] ? "is-updating" : "") + " svelte-16uhaqm")) {
    				attr(table, "class", table_class_value);
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
    			if (if_block) if_block.d();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $featuredPosts;
    	component_subscribe($$self, featuredPosts, $$value => $$invalidate(2, $featuredPosts = $$value));
    	const mode = "development";
    	const dispatch = createEventDispatcher();
    	let hovering = false;
    	let { updating = false } = $$props;

    	const dragStart = (e, i) => {
    		e.dataTransfer.effectAllowed = 'move';
    		e.dataTransfer.dropEffect = 'move';
    		const start = i;
    		e.dataTransfer.setData('text/plain', start);
    	};

    	const dragDrop = async (e, target) => {
    		try {
    			$$invalidate(0, updating = true);
    			e.dataTransfer.dropEffect = 'move';
    			const start = parseInt(e.dataTransfer.getData("text/plain"));
    			const post_id = $featuredPosts[start].id;
    			const from = $featuredPosts[start].slot.id;
    			const to = $featuredPosts[target].slot.id;

    			if (!from || !to) {
    				throw "From or to is missing";
    			}

    			if (from === to) {
    				throw "From and to are the same";
    			}

    			if (!post_id) {
    				throw "Post id is missing";
    			}

    			set_store_value(featuredPosts, $featuredPosts = (await apiPost(`frontpageengine/v1/move_post/${$featuredPosts[start].slot.frontpage_id}?${mode == "development" ? "simulate_analytics=1" : ""}`, { post_id, from, to })).posts.map(map_posts), $featuredPosts);
    			dispatch("updated");
    			$$invalidate(1, hovering = null);
    			$$invalidate(0, updating = false);
    		} catch(e) {
    			console.error(e);
    			$$invalidate(1, hovering = null);
    			$$invalidate(0, updating = false);
    		}
    	};

    	const doLock = async (post, date) => {
    		$$invalidate(0, updating = true);
    		let lock_until = new Date().getTime() + 1000 * 60 * 60 * 24;

    		if (date) {
    			lock_until = new Date(date).getTime();
    		}

    		set_store_value(
    			featuredPosts,
    			$featuredPosts = (await apiPost(`frontpageengine/v1/lock_post/${post.slot.frontpage_id}?${"simulate_analytics=1" }`, {
    				lock_until: formatTimeSql(new Date(lock_until)),
    				post_id: post.slot.post_id
    			})).posts.map(map_posts),
    			$featuredPosts
    		);

    		dispatch("updated");
    		$$invalidate(0, updating = false);
    	};

    	const chooseTime = post => {
    		const date = prompt("Enter a date and time to lock the post until (YYYY-MM-DD HH:MM)", formatTime(new Date(post.slot.lock_until)));

    		if (date) {
    			// Check date is valid
    			if (!(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/).test(date)) {
    				alert("Invalid date format");
    				return;
    			}

    			// Check date is in the future
    			if (new Date(date).getTime() < new Date().getTime()) {
    				alert("Date must be in the future");
    				return;
    			}

    			doLock(post, date);
    		}
    	};

    	const doUnlock = async post => {
    		$$invalidate(0, updating = true);
    		set_store_value(featuredPosts, $featuredPosts = (await apiPost(`frontpageengine/v1/unlock_post/${post.slot.frontpage_id}?${"simulate_analytics=1" }`, { post_id: post.slot.post_id })).posts.map(map_posts), $featuredPosts);
    		$$invalidate(0, updating = false);
    		dispatch("updated");
    	};

    	const doRemove = async post => {
    		if (confirm("Are you sure you want to remove this post from the frontpage?")) {
    			$$invalidate(0, updating = true);

    			try {
    				set_store_value(featuredPosts, $featuredPosts = (await apiPost(`frontpageengine/v1/remove_post/${post.slot.frontpage_id}?${mode == "development" ? "simulate_analytics=1" : ""}`, { post_id: post.id })).posts.map(map_posts), $featuredPosts);
    				dispatch("updated");
    			} catch(e) {
    				console.error(e);
    				alert("Error removing post: " + e.message);
    			}

    			$$invalidate(0, updating = false);
    		}
    	};

    	const checkAll = e => {
    		if (e.target.checked) {
    			set_store_value(
    				featuredPosts,
    				$featuredPosts = $featuredPosts.map(p => {
    					p.checked = true;
    					return p;
    				}),
    				$featuredPosts
    			);
    		} else {
    			set_store_value(
    				featuredPosts,
    				$featuredPosts = $featuredPosts.map(p => {
    					p.checked = false;
    					return p;
    				}),
    				$featuredPosts
    			);
    		}
    	};

    	const formatTime = time => {
    		const date = new Date(time);
    		return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0") + " " + date.getHours() + ":" + String(date.getMinutes()).padStart(2, "0");
    	};

    	const formatTimeSql = time => {
    		const date = new Date(time);
    		return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    	};

    	onMount(() => {
    		console.log("onMount");
    	});

    	function input_change_handler(each_value, index) {
    		each_value[index].checked = this.checked;
    		featuredPosts.set($featuredPosts);
    	}

    	const dragstart_handler = (index, e) => dragStart(e, index);
    	const drop_handler = (index, e) => dragDrop(e, index);
    	const dragenter_handler = (post, index) => $$invalidate(1, hovering = !post.locked && !!post.slot.post_id && index);

    	$$self.$$set = $$props => {
    		if ('updating' in $$props) $$invalidate(0, updating = $$props.updating);
    	};

    	return [
    		updating,
    		hovering,
    		$featuredPosts,
    		mode,
    		dragStart,
    		dragDrop,
    		doLock,
    		chooseTime,
    		doUnlock,
    		doRemove,
    		checkAll,
    		formatTime,
    		input_change_handler,
    		dragstart_handler,
    		drop_handler,
    		dragenter_handler
    	];
    }

    class FrontpageTable extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { updating: 0 }, add_css$3);
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

    const controllers = {};

    const wp_api_post = async (action, data, name=null) => {
        const controller = new AbortController();
        if (name) {
            if (controllers[name]) {
                controllers[name].abort();
            }
            controllers[name] = controller;
        }
        const response = await fetch(ajax_var.url, {
            signal: controller.signal,
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
            throw new Error(e);
        }
    };

    /* src/components/AddPostTable.svelte generated by Svelte v3.52.0 */

    function add_css$2(target) {
    	append_styles(target, "svelte-1cbifzv", ".column-header-image.svelte-1cbifzv{width:50px}.column-header-title.svelte-1cbifzv{width:500px}");
    }

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	child_ctx[11] = i;
    	return child_ctx;
    }

    // (62:12) {#if (mode === "development")}
    function create_if_block$1(ctx) {
    	let th0;
    	let t1;
    	let th1;
    	let t3;
    	let th2;

    	return {
    		c() {
    			th0 = element("th");
    			th0.textContent = "Slot ID";
    			t1 = space();
    			th1 = element("th");
    			th1.textContent = "Post ID";
    			t3 = space();
    			th2 = element("th");
    			th2.textContent = "Display Order";
    			attr(th0, "scope", "col");
    			attr(th0, "class", "manage-column");
    			attr(th1, "scope", "col");
    			attr(th1, "class", "manage-column");
    			attr(th2, "scope", "col");
    			attr(th2, "class", "manage-column");
    		},
    		m(target, anchor) {
    			insert(target, th0, anchor);
    			insert(target, t1, anchor);
    			insert(target, th1, anchor);
    			insert(target, t3, anchor);
    			insert(target, th2, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(th0);
    			if (detaching) detach(t1);
    			if (detaching) detach(th1);
    			if (detaching) detach(t3);
    			if (detaching) detach(th2);
    		}
    	};
    }

    // (75:8) {#each posts as post, index (post.id)}
    function create_each_block$1(key_1, ctx) {
    	let tr;
    	let th0;
    	let t2;
    	let postrow;
    	let t3;
    	let th1;
    	let button0;
    	let t5;
    	let button1;
    	let t7;
    	let button2;
    	let t9;
    	let tr_id_value;
    	let tr_outro;
    	let current;
    	let mounted;
    	let dispose;

    	postrow = new PostRow({
    			props: {
    				post: /*post*/ ctx[9],
    				index: /*index*/ ctx[11]
    			}
    		});

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
    			button0 = element("button");
    			button0.textContent = "Top";
    			t5 = space();
    			button1 = element("button");
    			button1.textContent = "Bottom";
    			t7 = space();
    			button2 = element("button");
    			button2.textContent = "Auto";
    			t9 = space();
    			attr(th0, "scope", "row");
    			attr(th0, "class", "check-column");
    			attr(button0, "class", "button button-primary");
    			attr(button1, "class", "button button-primary");
    			attr(button2, "class", "button button-primary");
    			attr(tr, "id", tr_id_value = "post-" + /*post*/ ctx[9].id);
    			this.first = tr;
    		},
    		m(target, anchor) {
    			insert(target, tr, anchor);
    			append(tr, th0);
    			append(tr, t2);
    			mount_component(postrow, tr, null);
    			append(tr, t3);
    			append(tr, th1);
    			append(th1, button0);
    			append(th1, t5);
    			append(th1, button1);
    			append(th1, t7);
    			append(th1, button2);
    			append(tr, t9);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", function () {
    						if (is_function(/*featurePost*/ ctx[2](/*post*/ ctx[9], "top"))) /*featurePost*/ ctx[2](/*post*/ ctx[9], "top").apply(this, arguments);
    					}),
    					listen(button1, "click", function () {
    						if (is_function(/*featurePost*/ ctx[2](/*post*/ ctx[9], "bottom"))) /*featurePost*/ ctx[2](/*post*/ ctx[9], "bottom").apply(this, arguments);
    					}),
    					listen(button2, "click", function () {
    						if (is_function(/*featurePost*/ ctx[2](/*post*/ ctx[9], "auto"))) /*featurePost*/ ctx[2](/*post*/ ctx[9], "auto").apply(this, arguments);
    					})
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const postrow_changes = {};
    			if (dirty & /*posts*/ 1) postrow_changes.post = /*post*/ ctx[9];
    			if (dirty & /*posts*/ 1) postrow_changes.index = /*index*/ ctx[11];
    			postrow.$set(postrow_changes);

    			if (!current || dirty & /*posts*/ 1 && tr_id_value !== (tr_id_value = "post-" + /*post*/ ctx[9].id)) {
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

    function create_fragment$3(ctx) {
    	let table;
    	let thead;
    	let tr;
    	let td;
    	let t2;
    	let th0;
    	let t4;
    	let t5;
    	let th1;
    	let t7;
    	let th2;
    	let t9;
    	let th3;
    	let t11;
    	let th4;
    	let t12;
    	let th5;
    	let t13;
    	let tbody;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;
    	let if_block = /*mode*/ ctx[1] === "development" && create_if_block$1();
    	let each_value = /*posts*/ ctx[0];
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
    			tr = element("tr");
    			td = element("td");

    			td.innerHTML = `<label class="screen-reader-text" for="cb-select-all-1">Select All</label> 
                <input class="cb-select-all-1" type="checkbox"/>`;

    			t2 = space();
    			th0 = element("th");
    			th0.textContent = "Image";
    			t4 = space();
    			if (if_block) if_block.c();
    			t5 = space();
    			th1 = element("th");
    			th1.textContent = "Title";
    			t7 = space();
    			th2 = element("th");
    			th2.textContent = "Author";
    			t9 = space();
    			th3 = element("th");
    			th3.textContent = "Published";
    			t11 = space();
    			th4 = element("th");
    			t12 = space();
    			th5 = element("th");
    			t13 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(td, "class", "manage-column check-column");
    			attr(th0, "scope", "col");
    			attr(th0, "class", "column-header-image svelte-1cbifzv");
    			attr(th1, "scope", "col");
    			attr(th1, "class", "column-header-title svelte-1cbifzv");
    			attr(th2, "scope", "col");
    			attr(th2, "class", "manage-column");
    			attr(th3, "scope", "col");
    			attr(th3, "class", "manage-column");
    			attr(table, "class", "wp-list-table widefat fixed striped table-view-list featuredposts");
    		},
    		m(target, anchor) {
    			insert(target, table, anchor);
    			append(table, thead);
    			append(thead, tr);
    			append(tr, td);
    			append(tr, t2);
    			append(tr, th0);
    			append(tr, t4);
    			if (if_block) if_block.m(tr, null);
    			append(tr, t5);
    			append(tr, th1);
    			append(tr, t7);
    			append(tr, th2);
    			append(tr, t9);
    			append(tr, th3);
    			append(tr, t11);
    			append(tr, th4);
    			append(tr, t12);
    			append(tr, th5);
    			append(table, t13);
    			append(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*posts, featurePost*/ 5) {
    				each_value = /*posts*/ ctx[0];
    				group_outros();
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, tbody, outro_and_destroy_block, create_each_block$1, null, get_each_context$1);
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
    			if (if_block) if_block.d();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $unorderedPosts;
    	let $unfeaturedPosts;
    	let $featuredPosts;
    	component_subscribe($$self, unorderedPosts, $$value => $$invalidate(5, $unorderedPosts = $$value));
    	component_subscribe($$self, unfeaturedPosts, $$value => $$invalidate(6, $unfeaturedPosts = $$value));
    	component_subscribe($$self, featuredPosts, $$value => $$invalidate(7, $featuredPosts = $$value));
    	const mode = "development";
    	const dispatch = createEventDispatcher();
    	let { frontpage_id } = $$props;
    	let { type = "unfeatured" } = $$props;
    	let posts = [];

    	// const dragStart = (e, i) => {
    	//     console.log("dragStart", i);
    	//     e.dataTransfer.effectAllowed = 'move';
    	//     e.dataTransfer.dropEffect = 'move';
    	//     const start = i;
    	//     e.dataTransfer.setData('text/plain', start);
    	//     dispatch("dragstart");
    	// }
    	const featurePost = async (post, position) => {
    		set_store_value(featuredPosts, $featuredPosts = (await apiPost(`frontpageengine/v1/add_post/${frontpage_id}`, { post_id: post.id, position })).posts.map(map_posts), $featuredPosts);
    		$$invalidate(0, posts = posts.filter(p => p.id !== post.id));
    		dispatch("updated");
    	};

    	onMount(async () => {
    		if (type === "unfeatured") {
    			$$invalidate(0, posts = $unfeaturedPosts);
    			const result = await apiGet(`frontpageengine/v1/unfeatured_posts/${frontpage_id}`);
    			set_store_value(unfeaturedPosts, $unfeaturedPosts = result.posts.map(map_posts), $unfeaturedPosts);
    			$$invalidate(0, posts = $unfeaturedPosts);
    		} else if (type === "unordered") {
    			$$invalidate(0, posts = $unorderedPosts); // console.log(posts);
    			const result = await wp_api_post("frontpage_engine_fetch_unordered_posts", { id: frontpage_id });
    			set_store_value(unorderedPosts, $unorderedPosts = result.map(map_posts), $unorderedPosts);
    			$$invalidate(0, posts = $unorderedPosts);
    		}
    	});

    	$$self.$$set = $$props => {
    		if ('frontpage_id' in $$props) $$invalidate(3, frontpage_id = $$props.frontpage_id);
    		if ('type' in $$props) $$invalidate(4, type = $$props.type);
    	};

    	return [posts, mode, featurePost, frontpage_id, type];
    }

    class AddPostTable extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { frontpage_id: 3, type: 4 }, add_css$2);
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

    function create_fragment$2(ctx) {
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

    function instance$2($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {}, add_css$1);
    	}
    }

    // Unique ID creation requires a high quality random # generator. In the browser we therefore
    // require the crypto API and do not support built-in fallback to lower quality random number
    // generators (like Math.random()).
    let getRandomValues;
    const rnds8 = new Uint8Array(16);
    function rng() {
      // lazy load so that environments that need to polyfill have a chance to do so
      if (!getRandomValues) {
        // getRandomValues needs to be invoked in a context where "this" is a Crypto implementation.
        getRandomValues = typeof crypto !== 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto);

        if (!getRandomValues) {
          throw new Error('crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported');
        }
      }

      return getRandomValues(rnds8);
    }

    var REGEX = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;

    function validate(uuid) {
      return typeof uuid === 'string' && REGEX.test(uuid);
    }

    /**
     * Convert array of 16 byte values to UUID string format of the form:
     * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
     */

    const byteToHex = [];

    for (let i = 0; i < 256; ++i) {
      byteToHex.push((i + 0x100).toString(16).slice(1));
    }

    function unsafeStringify(arr, offset = 0) {
      // Note: Be careful editing this code!  It's been tuned for performance
      // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
      return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + '-' + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + '-' + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + '-' + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + '-' + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
    }

    function parse(uuid) {
      if (!validate(uuid)) {
        throw TypeError('Invalid UUID');
      }

      let v;
      const arr = new Uint8Array(16); // Parse ########-....-....-....-............

      arr[0] = (v = parseInt(uuid.slice(0, 8), 16)) >>> 24;
      arr[1] = v >>> 16 & 0xff;
      arr[2] = v >>> 8 & 0xff;
      arr[3] = v & 0xff; // Parse ........-####-....-....-............

      arr[4] = (v = parseInt(uuid.slice(9, 13), 16)) >>> 8;
      arr[5] = v & 0xff; // Parse ........-....-####-....-............

      arr[6] = (v = parseInt(uuid.slice(14, 18), 16)) >>> 8;
      arr[7] = v & 0xff; // Parse ........-....-....-####-............

      arr[8] = (v = parseInt(uuid.slice(19, 23), 16)) >>> 8;
      arr[9] = v & 0xff; // Parse ........-....-....-....-############
      // (Use "/" to avoid 32-bit truncation when bit-shifting high-order bytes)

      arr[10] = (v = parseInt(uuid.slice(24, 36), 16)) / 0x10000000000 & 0xff;
      arr[11] = v / 0x100000000 & 0xff;
      arr[12] = v >>> 24 & 0xff;
      arr[13] = v >>> 16 & 0xff;
      arr[14] = v >>> 8 & 0xff;
      arr[15] = v & 0xff;
      return arr;
    }

    function stringToBytes(str) {
      str = unescape(encodeURIComponent(str)); // UTF8 escape

      const bytes = [];

      for (let i = 0; i < str.length; ++i) {
        bytes.push(str.charCodeAt(i));
      }

      return bytes;
    }

    const DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const URL = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
    function v35(name, version, hashfunc) {
      function generateUUID(value, namespace, buf, offset) {
        var _namespace;

        if (typeof value === 'string') {
          value = stringToBytes(value);
        }

        if (typeof namespace === 'string') {
          namespace = parse(namespace);
        }

        if (((_namespace = namespace) === null || _namespace === void 0 ? void 0 : _namespace.length) !== 16) {
          throw TypeError('Namespace must be array-like (16 iterable integer values, 0-255)');
        } // Compute hash of namespace and value, Per 4.3
        // Future: Use spread syntax when supported on all platforms, e.g. `bytes =
        // hashfunc([...namespace, ... value])`


        let bytes = new Uint8Array(16 + value.length);
        bytes.set(namespace);
        bytes.set(value, namespace.length);
        bytes = hashfunc(bytes);
        bytes[6] = bytes[6] & 0x0f | version;
        bytes[8] = bytes[8] & 0x3f | 0x80;

        if (buf) {
          offset = offset || 0;

          for (let i = 0; i < 16; ++i) {
            buf[offset + i] = bytes[i];
          }

          return buf;
        }

        return unsafeStringify(bytes);
      } // Function#name is not settable on some platforms (#270)


      try {
        generateUUID.name = name; // eslint-disable-next-line no-empty
      } catch (err) {} // For CommonJS default export support


      generateUUID.DNS = DNS;
      generateUUID.URL = URL;
      return generateUUID;
    }

    /*
     * Browser-compatible JavaScript MD5
     *
     * Modification of JavaScript MD5
     * https://github.com/blueimp/JavaScript-MD5
     *
     * Copyright 2011, Sebastian Tschan
     * https://blueimp.net
     *
     * Licensed under the MIT license:
     * https://opensource.org/licenses/MIT
     *
     * Based on
     * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
     * Digest Algorithm, as defined in RFC 1321.
     * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
     * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
     * Distributed under the BSD License
     * See http://pajhome.org.uk/crypt/md5 for more info.
     */
    function md5(bytes) {
      if (typeof bytes === 'string') {
        const msg = unescape(encodeURIComponent(bytes)); // UTF8 escape

        bytes = new Uint8Array(msg.length);

        for (let i = 0; i < msg.length; ++i) {
          bytes[i] = msg.charCodeAt(i);
        }
      }

      return md5ToHexEncodedArray(wordsToMd5(bytesToWords(bytes), bytes.length * 8));
    }
    /*
     * Convert an array of little-endian words to an array of bytes
     */


    function md5ToHexEncodedArray(input) {
      const output = [];
      const length32 = input.length * 32;
      const hexTab = '0123456789abcdef';

      for (let i = 0; i < length32; i += 8) {
        const x = input[i >> 5] >>> i % 32 & 0xff;
        const hex = parseInt(hexTab.charAt(x >>> 4 & 0x0f) + hexTab.charAt(x & 0x0f), 16);
        output.push(hex);
      }

      return output;
    }
    /**
     * Calculate output length with padding and bit length
     */


    function getOutputLength(inputLength8) {
      return (inputLength8 + 64 >>> 9 << 4) + 14 + 1;
    }
    /*
     * Calculate the MD5 of an array of little-endian words, and a bit length.
     */


    function wordsToMd5(x, len) {
      /* append padding */
      x[len >> 5] |= 0x80 << len % 32;
      x[getOutputLength(len) - 1] = len;
      let a = 1732584193;
      let b = -271733879;
      let c = -1732584194;
      let d = 271733878;

      for (let i = 0; i < x.length; i += 16) {
        const olda = a;
        const oldb = b;
        const oldc = c;
        const oldd = d;
        a = md5ff(a, b, c, d, x[i], 7, -680876936);
        d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
        c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
        b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
        a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
        d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
        c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
        b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
        a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
        d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
        c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
        b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
        a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
        d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
        c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
        b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);
        a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
        d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
        c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
        b = md5gg(b, c, d, a, x[i], 20, -373897302);
        a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
        d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
        c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
        b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
        a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
        d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
        c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
        b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
        a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
        d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
        c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
        b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);
        a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
        d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
        c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
        b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
        a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
        d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
        c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
        b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
        a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
        d = md5hh(d, a, b, c, x[i], 11, -358537222);
        c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
        b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
        a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
        d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
        c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
        b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);
        a = md5ii(a, b, c, d, x[i], 6, -198630844);
        d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
        c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
        b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
        a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
        d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
        c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
        b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
        a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
        d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
        c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
        b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
        a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
        d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
        c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
        b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);
        a = safeAdd(a, olda);
        b = safeAdd(b, oldb);
        c = safeAdd(c, oldc);
        d = safeAdd(d, oldd);
      }

      return [a, b, c, d];
    }
    /*
     * Convert an array bytes to an array of little-endian words
     * Characters >255 have their high-byte silently ignored.
     */


    function bytesToWords(input) {
      if (input.length === 0) {
        return [];
      }

      const length8 = input.length * 8;
      const output = new Uint32Array(getOutputLength(length8));

      for (let i = 0; i < length8; i += 8) {
        output[i >> 5] |= (input[i / 8] & 0xff) << i % 32;
      }

      return output;
    }
    /*
     * Add integers, wrapping at 2^32. This uses 16-bit operations internally
     * to work around bugs in some JS interpreters.
     */


    function safeAdd(x, y) {
      const lsw = (x & 0xffff) + (y & 0xffff);
      const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
      return msw << 16 | lsw & 0xffff;
    }
    /*
     * Bitwise rotate a 32-bit number to the left.
     */


    function bitRotateLeft(num, cnt) {
      return num << cnt | num >>> 32 - cnt;
    }
    /*
     * These functions implement the four basic operations the algorithm uses.
     */


    function md5cmn(q, a, b, x, s, t) {
      return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
    }

    function md5ff(a, b, c, d, x, s, t) {
      return md5cmn(b & c | ~b & d, a, b, x, s, t);
    }

    function md5gg(a, b, c, d, x, s, t) {
      return md5cmn(b & d | c & ~d, a, b, x, s, t);
    }

    function md5hh(a, b, c, d, x, s, t) {
      return md5cmn(b ^ c ^ d, a, b, x, s, t);
    }

    function md5ii(a, b, c, d, x, s, t) {
      return md5cmn(c ^ (b | ~d), a, b, x, s, t);
    }

    v35('v3', 0x30, md5);

    const randomUUID = typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID.bind(crypto);
    var native = {
      randomUUID
    };

    function v4(options, buf, offset) {
      if (native.randomUUID && !buf && !options) {
        return native.randomUUID();
      }

      options = options || {};
      const rnds = options.random || (options.rng || rng)(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`

      rnds[6] = rnds[6] & 0x0f | 0x40;
      rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

      if (buf) {
        offset = offset || 0;

        for (let i = 0; i < 16; ++i) {
          buf[offset + i] = rnds[i];
        }

        return buf;
      }

      return unsafeStringify(rnds);
    }

    // Adapted from Chris Veness' SHA1 code at
    // http://www.movable-type.co.uk/scripts/sha1.html
    function f(s, x, y, z) {
      switch (s) {
        case 0:
          return x & y ^ ~x & z;

        case 1:
          return x ^ y ^ z;

        case 2:
          return x & y ^ x & z ^ y & z;

        case 3:
          return x ^ y ^ z;
      }
    }

    function ROTL(x, n) {
      return x << n | x >>> 32 - n;
    }

    function sha1(bytes) {
      const K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];
      const H = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];

      if (typeof bytes === 'string') {
        const msg = unescape(encodeURIComponent(bytes)); // UTF8 escape

        bytes = [];

        for (let i = 0; i < msg.length; ++i) {
          bytes.push(msg.charCodeAt(i));
        }
      } else if (!Array.isArray(bytes)) {
        // Convert Array-like to Array
        bytes = Array.prototype.slice.call(bytes);
      }

      bytes.push(0x80);
      const l = bytes.length / 4 + 2;
      const N = Math.ceil(l / 16);
      const M = new Array(N);

      for (let i = 0; i < N; ++i) {
        const arr = new Uint32Array(16);

        for (let j = 0; j < 16; ++j) {
          arr[j] = bytes[i * 64 + j * 4] << 24 | bytes[i * 64 + j * 4 + 1] << 16 | bytes[i * 64 + j * 4 + 2] << 8 | bytes[i * 64 + j * 4 + 3];
        }

        M[i] = arr;
      }

      M[N - 1][14] = (bytes.length - 1) * 8 / Math.pow(2, 32);
      M[N - 1][14] = Math.floor(M[N - 1][14]);
      M[N - 1][15] = (bytes.length - 1) * 8 & 0xffffffff;

      for (let i = 0; i < N; ++i) {
        const W = new Uint32Array(80);

        for (let t = 0; t < 16; ++t) {
          W[t] = M[i][t];
        }

        for (let t = 16; t < 80; ++t) {
          W[t] = ROTL(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);
        }

        let a = H[0];
        let b = H[1];
        let c = H[2];
        let d = H[3];
        let e = H[4];

        for (let t = 0; t < 80; ++t) {
          const s = Math.floor(t / 20);
          const T = ROTL(a, 5) + f(s, b, c, d) + e + K[s] + W[t] >>> 0;
          e = d;
          d = c;
          c = ROTL(b, 30) >>> 0;
          b = a;
          a = T;
        }

        H[0] = H[0] + a >>> 0;
        H[1] = H[1] + b >>> 0;
        H[2] = H[2] + c >>> 0;
        H[3] = H[3] + d >>> 0;
        H[4] = H[4] + e >>> 0;
      }

      return [H[0] >> 24 & 0xff, H[0] >> 16 & 0xff, H[0] >> 8 & 0xff, H[0] & 0xff, H[1] >> 24 & 0xff, H[1] >> 16 & 0xff, H[1] >> 8 & 0xff, H[1] & 0xff, H[2] >> 24 & 0xff, H[2] >> 16 & 0xff, H[2] >> 8 & 0xff, H[2] & 0xff, H[3] >> 24 & 0xff, H[3] >> 16 & 0xff, H[3] >> 8 & 0xff, H[3] & 0xff, H[4] >> 24 & 0xff, H[4] >> 16 & 0xff, H[4] >> 8 & 0xff, H[4] & 0xff];
    }

    v35('v5', 0x50, sha1);

    /* src/components/Message.svelte generated by Svelte v3.52.0 */

    function create_fragment$1(ctx) {
    	let div;
    	let p;
    	let div_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	return {
    		c() {
    			div = element("div");
    			p = element("p");
    			if (default_slot) default_slot.c();
    			attr(div, "class", div_class_value = "notice notice-" + /*type*/ ctx[0] + " is-dismissible");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, p);

    			if (default_slot) {
    				default_slot.m(p, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[1],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*type*/ 1 && div_class_value !== (div_class_value = "notice notice-" + /*type*/ ctx[0] + " is-dismissible")) {
    				attr(div, "class", div_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { type = "success" } = $$props;

    	$$self.$$set = $$props => {
    		if ('type' in $$props) $$invalidate(0, type = $$props.type);
    		if ('$$scope' in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [type, $$scope, slots];
    }

    class Message extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { type: 0 });
    	}
    }

    /* src/App.svelte generated by Svelte v3.52.0 */

    function add_css(target) {
    	append_styles(target, "svelte-4dra5q", ".unordered-posts-alert.svelte-4dra5q{background-color:rgb(213, 57, 57);color:white;border-radius:50%;width:30px;height:30px;text-align:center;top:0;right:0;margin:0px 10px;font-size:15px;line-height:30px;cursor:pointer}.action-bar.svelte-4dra5q{display:flex;justify-content:left;flex-direction:row}.button.svelte-4dra5q{margin-right:10px}");
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[27] = list[i];
    	return child_ctx;
    }

    // (129:8) <Message type={message.type}>
    function create_default_slot_2(ctx) {
    	let t_value = /*message*/ ctx[27].message + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*messages*/ 2 && t_value !== (t_value = /*message*/ ctx[27].message + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (128:4) {#each messages as message}
    function create_each_block(ctx) {
    	let message;
    	let current;

    	message = new Message({
    			props: {
    				type: /*message*/ ctx[27].type,
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(message.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(message, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const message_changes = {};
    			if (dirty & /*messages*/ 2) message_changes.type = /*message*/ ctx[27].type;

    			if (dirty & /*$$scope, messages*/ 1073741826) {
    				message_changes.$$scope = { dirty, ctx };
    			}

    			message.$set(message_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(message.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(message.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(message, detaching);
    		}
    	};
    }

    // (132:8) {#if $unorderedPosts.length > 0}
    function create_if_block_3(ctx) {
    	let div;
    	let t_value = /*$unorderedPosts*/ ctx[6].length + "";
    	let t;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			t = text(t_value);
    			attr(div, "class", "unordered-posts-alert svelte-4dra5q");
    			attr(div, "alt", "Posts awaiting placement");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);

    			if (!mounted) {
    				dispose = listen(div, "click", /*click_handler*/ ctx[13]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*$unorderedPosts*/ 64 && t_value !== (t_value = /*$unorderedPosts*/ ctx[6].length + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (138:8) {#if show_group_actions}
    function create_if_block_2(ctx) {
    	let select;
    	let option0;
    	let option1;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Group action";
    			option1 = element("option");
    			option1.textContent = "Remove";
    			option0.__value = "0";
    			option0.value = option0.__value;
    			option1.__value = "remove";
    			option1.value = option1.__value;
    			attr(select, "class", "group-action");
    			if (/*group_action*/ ctx[5] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[16].call(select));
    		},
    		m(target, anchor) {
    			insert(target, select, anchor);
    			append(select, option0);
    			append(select, option1);
    			select_option(select, /*group_action*/ ctx[5]);

    			if (!mounted) {
    				dispose = [
    					listen(select, "change", /*select_change_handler*/ ctx[16]),
    					listen(select, "change", /*onGroupAction*/ ctx[10])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*group_action*/ 32) {
    				select_option(select, /*group_action*/ ctx[5]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(select);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (146:4) {#if show_unordered_modal}
    function create_if_block_1(ctx) {
    	let modal;
    	let current;

    	modal = new Modal({
    			props: {
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			}
    		});

    	modal.$on("close", /*close_handler*/ ctx[17]);

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

    			if (dirty & /*$$scope, frontpage_id*/ 1073741825) {
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

    // (147:4) <Modal on:close="{() => show_unordered_modal = false}">
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

    	addposttable.$on("updated", /*updated*/ ctx[7]);

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

    // (152:4) {#if show_modal}
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

    	modal.$on("close", /*close_handler_1*/ ctx[18]);

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

    			if (dirty & /*$$scope, frontpage_id*/ 1073741825) {
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

    // (153:4) <Modal on:close="{() => show_modal = false}">
    function create_default_slot(ctx) {
    	let addposttable;
    	let current;

    	addposttable = new AddPostTable({
    			props: { frontpage_id: /*frontpage_id*/ ctx[0] }
    		});

    	addposttable.$on("updated", /*updated*/ ctx[7]);

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

    // (154:8) 
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
    	let t0;
    	let div;
    	let t1;
    	let a0;
    	let t3;
    	let a1;
    	let t5;
    	let t6;
    	let hr;
    	let t7;
    	let t8;
    	let t9;
    	let frontpagetable;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*messages*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let if_block0 = /*$unorderedPosts*/ ctx[6].length > 0 && create_if_block_3(ctx);
    	let if_block1 = /*show_group_actions*/ ctx[4] && create_if_block_2(ctx);
    	let if_block2 = /*show_unordered_modal*/ ctx[3] && create_if_block_1(ctx);
    	let if_block3 = /*show_modal*/ ctx[2] && create_if_block(ctx);

    	frontpagetable = new FrontpageTable({
    			props: {
    				frontpage_id: /*frontpage_id*/ ctx[0],
    				updating
    			}
    		});

    	frontpagetable.$on("updated", /*updated*/ ctx[7]);
    	frontpagetable.$on("moved", /*onMove*/ ctx[8]);

    	return {
    		c() {
    			main = element("main");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t1 = space();
    			a0 = element("a");
    			a0.textContent = "Add posts";
    			t3 = space();
    			a1 = element("a");
    			a1.textContent = "Auto sort";
    			t5 = space();
    			if (if_block1) if_block1.c();
    			t6 = space();
    			hr = element("hr");
    			t7 = space();
    			if (if_block2) if_block2.c();
    			t8 = space();
    			if (if_block3) if_block3.c();
    			t9 = space();
    			create_component(frontpagetable.$$.fragment);
    			attr(a0, "href", "#show-modal");
    			attr(a0, "class", "button button-primary svelte-4dra5q");
    			attr(a1, "href", "#auto-sort");
    			attr(a1, "class", "button svelte-4dra5q");
    			attr(div, "class", "action-bar svelte-4dra5q");
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(main, null);
    			}

    			append(main, t0);
    			append(main, div);
    			if (if_block0) if_block0.m(div, null);
    			append(div, t1);
    			append(div, a0);
    			append(div, t3);
    			append(div, a1);
    			append(div, t5);
    			if (if_block1) if_block1.m(div, null);
    			append(main, t6);
    			append(main, hr);
    			append(main, t7);
    			if (if_block2) if_block2.m(main, null);
    			append(main, t8);
    			if (if_block3) if_block3.m(main, null);
    			append(main, t9);
    			mount_component(frontpagetable, main, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(a0, "click", /*click_handler_1*/ ctx[14]),
    					listen(a1, "click", /*click_handler_2*/ ctx[15])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*messages*/ 2) {
    				each_value = /*messages*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(main, t0);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (/*$unorderedPosts*/ ctx[6].length > 0) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					if_block0.m(div, t1);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*show_group_actions*/ ctx[4]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*show_unordered_modal*/ ctx[3]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*show_unordered_modal*/ 8) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(main, t8);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (/*show_modal*/ ctx[2]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);

    					if (dirty & /*show_modal*/ 4) {
    						transition_in(if_block3, 1);
    					}
    				} else {
    					if_block3 = create_if_block(ctx);
    					if_block3.c();
    					transition_in(if_block3, 1);
    					if_block3.m(main, t9);
    				}
    			} else if (if_block3) {
    				group_outros();

    				transition_out(if_block3, 1, 1, () => {
    					if_block3 = null;
    				});

    				check_outros();
    			}

    			const frontpagetable_changes = {};
    			if (dirty & /*frontpage_id*/ 1) frontpagetable_changes.frontpage_id = /*frontpage_id*/ ctx[0];
    			frontpagetable.$set(frontpagetable_changes);
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(if_block2);
    			transition_in(if_block3);
    			transition_in(frontpagetable.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(if_block2);
    			transition_out(if_block3);
    			transition_out(frontpagetable.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(main);
    			destroy_each(each_blocks, detaching);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			destroy_component(frontpagetable);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    let updating = false;

    function instance($$self, $$props, $$invalidate) {
    	let $featuredPosts;
    	let $totalHits;
    	let $analytics;
    	let $unorderedPosts;
    	component_subscribe($$self, featuredPosts, $$value => $$invalidate(12, $featuredPosts = $$value));
    	component_subscribe($$self, totalHits, $$value => $$invalidate(20, $totalHits = $$value));
    	component_subscribe($$self, analytics, $$value => $$invalidate(21, $analytics = $$value));
    	component_subscribe($$self, unorderedPosts, $$value => $$invalidate(6, $unorderedPosts = $$value));
    	const mode = "development";
    	const dispatch = createEventDispatcher();
    	let { frontpage_id } = $$props;
    	let { url } = $$props;
    	let show_modal = false;
    	let show_unordered_modal = false;
    	let show_group_actions = false;
    	const uuid = v4();
    	let messages = [];
    	let socket = null;

    	onMount(async () => {
    		socket = new FrontPageEngineSocketServer(url);
    		socket.subscribe(`frontpage-${frontpage_id}`);

    		socket.on("frontpage_updated", async message => {
    			if (uuid === message.uuid) return;
    			await getPosts();
    		});

    		await getPosts();
    		await getAnalytics();
    		setInterval(getPosts, 600000); // Check posts every 10 minutes
    		setInterval(getAnalytics, 60000); // Check analytics every minute
    	});

    	onDestroy(() => {
    		socket.close();
    	});

    	const getPosts = async () => {
    		const wp_posts = await apiGet(`frontpageengine/v1/get_posts/${frontpage_id}?${"simulate_analytics=1" }`);
    		set_store_value(featuredPosts, $featuredPosts = wp_posts.posts.map(map_posts), $featuredPosts);
    		console.log("featuredPosts", $featuredPosts);
    	};

    	const getAnalytics = async () => {
    		{
    			set_store_value(analytics, $analytics = Object.values((await apiGet(`frontpageengine/v1/analytics/${frontpage_id}?simulate_analytics=1`)).analytics), $analytics);
    		}

    		set_store_value(totalHits, $totalHits = $analytics.reduce((a, b) => a + b.hits_last_hour, 0), $totalHits);
    		console.log("totalHits", $totalHits);
    	};

    	const updated = async () => {
    		socket.sendMessage({
    			name: "frontpage_updated",
    			message: "Updated front page",
    			uuid
    		});
    	};

    	async function onMove(e) {
    		try {
    			const from = e.detail.from;
    			const to = e.detail.to;
    			const post_id = e.detail.post_id;

    			// console.log("moved", from, to, post_id);
    			const wp_posts = await apiPost(`frontpageengine/v1/move_post/${frontpage_id}`, { post_id, from, to }, "onMove");

    			// console.log(wp_posts);
    			set_store_value(featuredPosts, $featuredPosts = wp_posts.posts.map(map_posts), $featuredPosts);
    		} catch(error) {
    			console.error(error);

    			messages.push({
    				type: "error",
    				message: error.message || error
    			});

    			$$invalidate(1, messages);
    		} // console.log(messages);
    	}

    	const autoSort = async () => {
    		try {
    			const wp_posts = await apiGet(`frontpageengine/v1/autosort/${frontpage_id}?${mode === "development" ? "simulate_analytics=1" : ""}`);
    			set_store_value(featuredPosts, $featuredPosts = wp_posts.posts.map(map_posts), $featuredPosts);
    		} catch(error) {
    			console.error(error);

    			messages.push({
    				type: "error",
    				message: error.message || error
    			});

    			$$invalidate(1, messages);
    		} // console.log(messages);
    	};

    	let group_action;

    	const onGroupAction = async () => {
    		console.log(group_action);

    		if (group_action === "remove") {
    			if (confirm("Are you sure you want to remove these posts?")) {
    				const posts = $featuredPosts.filter(post => post.checked);

    				for (let post of posts) {
    					try {
    						console.log(post);
    						set_store_value(featuredPosts, $featuredPosts = (await apiPost(`frontpageengine/v1/remove_post/${post.slot.frontpage_id}`, { post_id: post.id })).posts.map(map_posts), $featuredPosts);
    					} catch(e) {
    						console.error(e);
    						alert("Error removing post: " + e.message);
    					}
    				}

    				dispatch("updated");
    			}
    		}

    		$$invalidate(5, group_action = "0");
    	};

    	const click_handler = () => $$invalidate(3, show_unordered_modal = true);
    	const click_handler_1 = () => $$invalidate(2, show_modal = true);
    	const click_handler_2 = () => autoSort();

    	function select_change_handler() {
    		group_action = select_value(this);
    		$$invalidate(5, group_action);
    	}

    	const close_handler = () => $$invalidate(3, show_unordered_modal = false);
    	const close_handler_1 = () => $$invalidate(2, show_modal = false);

    	$$self.$$set = $$props => {
    		if ('frontpage_id' in $$props) $$invalidate(0, frontpage_id = $$props.frontpage_id);
    		if ('url' in $$props) $$invalidate(11, url = $$props.url);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$featuredPosts, messages*/ 4098) {
    			if ($featuredPosts.length > 0) {
    				// $featuredPosts = applySlots($featuredPosts, $slots);
    				// $featuredPosts = applyAnalytics($featuredPosts, $analytics);
    				$$invalidate(4, show_group_actions = $featuredPosts.filter(post => post.checked).length > 0);

    				console.log(messages);
    			}
    		}
    	};

    	return [
    		frontpage_id,
    		messages,
    		show_modal,
    		show_unordered_modal,
    		show_group_actions,
    		group_action,
    		$unorderedPosts,
    		updated,
    		onMove,
    		autoSort,
    		onGroupAction,
    		url,
    		$featuredPosts,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		select_change_handler,
    		close_handler,
    		close_handler_1
    	];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, { frontpage_id: 0, url: 11 }, add_css);
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
