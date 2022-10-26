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

    const featuredPosts = writable([
        {
            id: 1,
            title: "Hello world",
            author: "John Doe",
            excerpt: "This is an excerpt",
            thumbnail: "https://via.placeholder.com/150",
            link: "https://example.com"
        },
        {
            id: 2,
            title: "Hello world 2",
            author: "Jane Doe",
            excerpt: "This is an excerpt 2",
            thumbnail: "https://via.placeholder.com/150",
            link: "https://example.com"
        },
        {
            id: 3,
            title: "Hello world 3",
            author: "John Donne",
            excerpt: "This is an excerpt 3",
            thumbnail: "https://via.placeholder.com/150",
            link: "https://example.com"
        },
    ]);

    /* src/components/PostRow.svelte generated by Svelte v3.52.0 */

    function create_if_block(ctx) {
    	let img;
    	let img_src_value;
    	let img_alt_value;

    	return {
    		c() {
    			img = element("img");
    			attr(img, "class", "image column-image");
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

    function create_fragment$2(ctx) {
    	let th;
    	let t2;
    	let td0;
    	let t3;
    	let td1;
    	let strong;
    	let a;
    	let t4_value = /*post*/ ctx[0].title + "";
    	let t4;
    	let a_href_value;
    	let t5;
    	let td2;
    	let t6_value = /*post*/ ctx[0].author + "";
    	let t6;
    	let t7;
    	let td3;
    	let t8_value = /*post*/ ctx[0].tags + "";
    	let t8;
    	let t9;
    	let td4;
    	let t10_value = /*post*/ ctx[0].date_published + "";
    	let t10;
    	let if_block = /*post*/ ctx[0].image && create_if_block(ctx);

    	return {
    		c() {
    			th = element("th");

    			th.innerHTML = `<label class="screen-reader-text" for="cb-select-1">Select</label> 
    <input class="cb-select-1" type="checkbox"/>`;

    			t2 = space();
    			td0 = element("td");
    			if (if_block) if_block.c();
    			t3 = space();
    			td1 = element("td");
    			strong = element("strong");
    			a = element("a");
    			t4 = text(t4_value);
    			t5 = space();
    			td2 = element("td");
    			t6 = text(t6_value);
    			t7 = space();
    			td3 = element("td");
    			t8 = text(t8_value);
    			t9 = space();
    			td4 = element("td");
    			t10 = text(t10_value);
    			attr(th, "scope", "row");
    			attr(th, "class", "check-column");
    			attr(td0, "class", "column-image");
    			attr(a, "class", "row-title");
    			attr(a, "href", a_href_value = /*post*/ ctx[0].link);
    			attr(td1, "class", "column-title");
    			attr(td2, "class", "column-author");
    			attr(td3, "class", "column-tags");
    			attr(td4, "class", "column-published");
    		},
    		m(target, anchor) {
    			insert(target, th, anchor);
    			insert(target, t2, anchor);
    			insert(target, td0, anchor);
    			if (if_block) if_block.m(td0, null);
    			insert(target, t3, anchor);
    			insert(target, td1, anchor);
    			append(td1, strong);
    			append(strong, a);
    			append(a, t4);
    			insert(target, t5, anchor);
    			insert(target, td2, anchor);
    			append(td2, t6);
    			insert(target, t7, anchor);
    			insert(target, td3, anchor);
    			append(td3, t8);
    			insert(target, t9, anchor);
    			insert(target, td4, anchor);
    			append(td4, t10);
    		},
    		p(ctx, [dirty]) {
    			if (/*post*/ ctx[0].image) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(td0, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*post*/ 1 && t4_value !== (t4_value = /*post*/ ctx[0].title + "")) set_data(t4, t4_value);

    			if (dirty & /*post*/ 1 && a_href_value !== (a_href_value = /*post*/ ctx[0].link)) {
    				attr(a, "href", a_href_value);
    			}

    			if (dirty & /*post*/ 1 && t6_value !== (t6_value = /*post*/ ctx[0].author + "")) set_data(t6, t6_value);
    			if (dirty & /*post*/ 1 && t8_value !== (t8_value = /*post*/ ctx[0].tags + "")) set_data(t8, t8_value);
    			if (dirty & /*post*/ 1 && t10_value !== (t10_value = /*post*/ ctx[0].date_published + "")) set_data(t10, t10_value);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(th);
    			if (detaching) detach(t2);
    			if (detaching) detach(td0);
    			if (if_block) if_block.d();
    			if (detaching) detach(t3);
    			if (detaching) detach(td1);
    			if (detaching) detach(t5);
    			if (detaching) detach(td2);
    			if (detaching) detach(t7);
    			if (detaching) detach(td3);
    			if (detaching) detach(t9);
    			if (detaching) detach(td4);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { post } = $$props;

    	$$self.$$set = $$props => {
    		if ('post' in $$props) $$invalidate(0, post = $$props.post);
    	};

    	return [post];
    }

    class PostRow extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { post: 0 });
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

    /* src/components/FrontpageTable.svelte generated by Svelte v3.52.0 */

    function add_css(target) {
    	append_styles(target, "svelte-1lxrbw0", "tr.is-active.svelte-1lxrbw0{background-color:rgb(128, 162, 213) !important}");
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	child_ctx[10] = i;
    	return child_ctx;
    }

    // (63:8) {#each $featuredPosts as post, index (post.id)}
    function create_each_block(key_1, ctx) {
    	let tr;
    	let postrow;
    	let t;
    	let tr_id_value;
    	let rect;
    	let stop_animation = noop;
    	let current;
    	let mounted;
    	let dispose;

    	postrow = new PostRow({
    			props: {
    				post: /*post*/ ctx[8],
    				index: /*index*/ ctx[10]
    			}
    		});

    	function dragstart_handler(...args) {
    		return /*dragstart_handler*/ ctx[4](/*index*/ ctx[10], ...args);
    	}

    	function drop_handler(...args) {
    		return /*drop_handler*/ ctx[5](/*index*/ ctx[10], ...args);
    	}

    	function dragenter_handler() {
    		return /*dragenter_handler*/ ctx[6](/*index*/ ctx[10]);
    	}

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			tr = element("tr");
    			create_component(postrow.$$.fragment);
    			t = space();
    			attr(tr, "id", tr_id_value = "post-" + /*post*/ ctx[8].id);
    			attr(tr, "draggable", true);
    			attr(tr, "ondragover", "return false");
    			attr(tr, "class", "svelte-1lxrbw0");
    			toggle_class(tr, "is-active", /*hovering*/ ctx[0] === /*index*/ ctx[10]);
    			this.first = tr;
    		},
    		m(target, anchor) {
    			insert(target, tr, anchor);
    			mount_component(postrow, tr, null);
    			append(tr, t);
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
    			if (dirty & /*$featuredPosts*/ 2) postrow_changes.post = /*post*/ ctx[8];
    			if (dirty & /*$featuredPosts*/ 2) postrow_changes.index = /*index*/ ctx[10];
    			postrow.$set(postrow_changes);

    			if (!current || dirty & /*$featuredPosts*/ 2 && tr_id_value !== (tr_id_value = "post-" + /*post*/ ctx[8].id)) {
    				attr(tr, "id", tr_id_value);
    			}

    			if (!current || dirty & /*hovering, $featuredPosts*/ 3) {
    				toggle_class(tr, "is-active", /*hovering*/ ctx[0] === /*index*/ ctx[10]);
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
    			stop_animation = create_animation(tr, rect, flip, {});
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

    function create_fragment$1(ctx) {
    	let table;
    	let thead;
    	let t12;
    	let tbody;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;
    	let each_value = /*$featuredPosts*/ ctx[1];
    	const get_key = ctx => /*post*/ ctx[8].id;

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
            <th scope="col" class="manage-column">Image</th> 
            <th scope="col" class="manage-column">Title</th> 
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
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, tbody, fix_and_outro_and_destroy_block, create_each_block, null, get_each_context);
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

    function instance$1($$self, $$props, $$invalidate) {
    	let $featuredPosts;
    	component_subscribe($$self, featuredPosts, $$value => $$invalidate(1, $featuredPosts = $$value));
    	const dispatch = createEventDispatcher();
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

    		await wp_api_post("frontpage_engine_order_posts", {
    			id: $featuredPosts[0].id,
    			ordering_code: ajax_var.ordering_code,
    			"order[]": $featuredPosts.map(post => post.id)
    		});

    		dispatch("updated");
    		$$invalidate(0, hovering = null);
    	};

    	onMount(() => {
    		console.log("onMount");
    	});

    	const dragstart_handler = (index, e) => dragStart(e, index);
    	const drop_handler = (index, e) => dragDrop(e, index);
    	const dragenter_handler = index => $$invalidate(0, hovering = index);

    	return [
    		hovering,
    		$featuredPosts,
    		dragStart,
    		dragDrop,
    		dragstart_handler,
    		drop_handler,
    		dragenter_handler
    	];
    }

    class FrontpageTable extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {}, add_css);
    	}
    }

    /* src/App.svelte generated by Svelte v3.52.0 */

    function create_fragment(ctx) {
    	let main;
    	let frontpagetable;
    	let current;
    	frontpagetable = new FrontpageTable({});
    	frontpagetable.$on("updated", /*updated*/ ctx[0]);

    	return {
    		c() {
    			main = element("main");
    			create_component(frontpagetable.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);
    			mount_component(frontpagetable, main, null);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(frontpagetable.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(frontpagetable.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(main);
    			destroy_component(frontpagetable);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let $featuredPosts;
    	component_subscribe($$self, featuredPosts, $$value => $$invalidate(4, $featuredPosts = $$value));
    	let { frontpage_id } = $$props;
    	let { url } = $$props;
    	let socket = null;

    	onMount(async () => {
    		console.log("onMount");
    		socket = new FrontPageEngineSocketServer(url);
    		socket.subscribe(`frontpage-${frontpage_id}`);
    		socket.on("frontpage_updated", getPosts);
    		await getPosts();
    	});

    	onDestroy(() => {
    		console.log("onDestroy");
    		socket.close();
    	});

    	const getPosts = async () => {
    		console.log('getPosts');
    		const wp_posts = await wp_api_post("frontpage_engine_fetch_posts", { id: frontpage_id });

    		set_store_value(
    			featuredPosts,
    			$featuredPosts = wp_posts.map(post => {
    				return {
    					id: post.id,
    					title: post.post_title,
    					author: post.post_author,
    					date_published: post.post_date,
    					type: post.post_type,
    					image: post.image,
    					order: post.menu_order
    				};
    			}),
    			$featuredPosts
    		);
    	};

    	const updated = () => {
    		socket.sendMessage({
    			name: "frontpage_updated",
    			message: "Updated front page"
    		});
    	};

    	$$self.$$set = $$props => {
    		if ('frontpage_id' in $$props) $$invalidate(1, frontpage_id = $$props.frontpage_id);
    		if ('url' in $$props) $$invalidate(2, url = $$props.url);
    	};

    	return [updated, frontpage_id, url];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, { frontpage_id: 1, url: 2 });
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

    async function main() {
        console.log("Loading frontpage engine...");
        const Helper = function (e, ui) {
            ui.children().children().each(
                function () {
                    jQuery( this ).width( jQuery( this ).width() );
                }
            );
            return ui;
        };

        function getOrder() {
            const order = jQuery( '#the-list input[name="featuredpost[]"]' ).map(function () { return jQuery( this ).val() }).get();        console.log(order);
            return order;
        }

        // Websocket
        const socketServer = new FrontPageEngineSocketServer(ajax_var.url);
        socketServer.subscribe(`frontpage-${ajax_var.featured_code}`);

        jQuery(function () {
            // Featured posts
            const featuredPostListTable = jQuery( 'table.featuredposts #the-list' );
            featuredPostListTable.sortable(
                {
                    'items': 'tr',
                    'axis': 'y',
                    'helper': Helper,
                    'update': function (e, ui) {
                        featuredPostListTable.sortable( "option", "disabled", true );
                        jQuery.post(
                            ajax_var.url,
                            {
                                nonce: ajax_var.nonce,
                                action: ajax_var.action,
                                ordering_code: ajax_var.ordering_code,
                                order: getOrder()
                            }
                        ).done(
                            function (data) {
                                socketServer.sendMessage("update");
                                featuredPostListTable.sortable( "option", "disabled", false );
                            }
                        );
                    }
                }
            );
        });

        // Unfeatured posts
        jQuery( '#frontpageengineFeaturePosts table.featuredposts #the-list' );
        jQuery(".btn-insert").on("click", e => {
            const postId = e.target.dataset.id;
            jQuery.post(
                ajax_var.url,
                {
                    nonce: ajax_var.nonce,
                    action: "frontpage_engine_insert_post",
                    ordering_code: ajax_var.ordering_code,
                    featured_code: ajax_var.featured_code,
                    position: 10,
                    post_id: postId
                }
            ).done(
                function (data) {
                    socketServer.sendMessage("update");
                    socketServer.close();
                    // unfeaturedPostTable.find(`tr[data-post-id="${postId}"]`).remove();
                    self.parent.tb_remove();
                }
            );
        });
    }

    main();

    return app;

})();
//# sourceMappingURL=frontpage_engine.js.map
