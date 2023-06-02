var frontpage_engine = (function () {
    'use strict';

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
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
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
     * Schedules a callback to run immediately after the component has been updated.
     *
     * The first time the callback runs will be after the initial `onMount`
     */
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
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
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
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
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
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
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                started = true;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
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
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = (program.b - t);
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
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

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
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

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }
    function getMonthLength(year, month) {
        const feb = isLeapYear(year) ? 29 : 28;
        const monthLengths = [31, feb, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        return monthLengths[month];
    }
    function toText(date, formatTokens) {
        let text = '';
        if (date) {
            for (const token of formatTokens) {
                if (typeof token === 'string') {
                    text += token;
                }
                else {
                    text += token.toString(date);
                }
            }
        }
        return text;
    }
    function getMonthDays(year, month) {
        const monthLength = getMonthLength(year, month);
        const days = [];
        for (let i = 0; i < monthLength; i++) {
            days.push({
                year: year,
                month: month,
                number: i + 1,
            });
        }
        return days;
    }
    function getCalendarDays(value, weekStartsOn) {
        const year = value.getFullYear();
        const month = value.getMonth();
        const firstWeekday = new Date(year, month, 1).getDay();
        let days = [];
        // add last month
        const daysBefore = (firstWeekday - weekStartsOn + 7) % 7;
        if (daysBefore > 0) {
            let lastMonth = month - 1;
            let lastMonthYear = year;
            if (lastMonth === -1) {
                lastMonth = 11;
                lastMonthYear = year - 1;
            }
            days = getMonthDays(lastMonthYear, lastMonth).slice(-daysBefore);
        }
        // add current month
        days = days.concat(getMonthDays(year, month));
        // add next month
        let nextMonth = month + 1;
        let nextMonthYear = year;
        if (nextMonth === 12) {
            nextMonth = 0;
            nextMonthYear = year + 1;
        }
        const daysAfter = 42 - days.length;
        days = days.concat(getMonthDays(nextMonthYear, nextMonth).slice(0, daysAfter));
        return days;
    }

    function getLocaleDefaults() {
        return {
            weekdays: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
            months: [
                'January',
                'February',
                'March',
                'April',
                'May',
                'June',
                'July',
                'August',
                'September',
                'October',
                'November',
                'December',
            ],
            weekStartsOn: 1,
        };
    }
    function getInnerLocale(locale = {}) {
        const innerLocale = getLocaleDefaults();
        if (typeof locale.weekStartsOn === 'number') {
            innerLocale.weekStartsOn = locale.weekStartsOn;
        }
        if (locale.months)
            innerLocale.months = locale.months;
        if (locale.weekdays)
            innerLocale.weekdays = locale.weekdays;
        return innerLocale;
    }

    /* src/components/date-picker-svelte/DatePicker.svelte generated by Svelte v3.52.0 */

    function add_css$8(target) {
    	append_styles(target, "svelte-w239uu", ".date-time-picker.svelte-w239uu.svelte-w239uu{display:inline-block;color:var(--date-picker-foreground, #000000);background:var(--date-picker-background, #ffffff);user-select:none;-webkit-user-select:none;padding:0.5rem;cursor:default;font-size:0.75rem;border:1px solid rgba(103, 113, 137, 0.3);border-radius:3px;box-shadow:0px 2px 6px rgba(0, 0, 0, 0.08), 0px 2px 6px rgba(0, 0, 0, 0.11);outline:none;transition:all 80ms cubic-bezier(0.4, 0, 0.2, 1)}.date-time-picker.svelte-w239uu.svelte-w239uu:focus{border-color:var(--date-picker-highlight-border, #0269f7);box-shadow:0px 0px 0px 2px var(--date-picker-highlight-shadow, rgba(2, 105, 247, 0.4))}.tab-container.svelte-w239uu.svelte-w239uu{outline:none}.top.svelte-w239uu.svelte-w239uu{display:flex;justify-content:center;align-items:center;padding-bottom:0.5rem}.dropdown.svelte-w239uu.svelte-w239uu{margin-left:0.25rem;margin-right:0.25rem;position:relative;display:flex}.dropdown.svelte-w239uu svg.svelte-w239uu{position:absolute;right:0px;top:0px;height:100%;width:8px;padding:0rem 0.5rem;pointer-events:none;box-sizing:content-box}.month.svelte-w239uu.svelte-w239uu{flex-grow:1}.year.svelte-w239uu.svelte-w239uu{flex-grow:1}svg.svelte-w239uu.svelte-w239uu{display:block;fill:var(--date-picker-foreground, #000000);opacity:0.75;outline:none}.page-button.svelte-w239uu.svelte-w239uu{background-color:transparent;width:1.5rem;height:1.5rem;flex-shrink:0;border-radius:5px;box-sizing:border-box;border:1px solid transparent;display:flex;align-items:center;justify-content:center}.page-button.svelte-w239uu.svelte-w239uu:hover{background-color:rgba(128, 128, 128, 0.08);border:1px solid rgba(128, 128, 128, 0.08)}.page-button.svelte-w239uu svg.svelte-w239uu{width:0.68rem;height:0.68rem}select.dummy-select.svelte-w239uu.svelte-w239uu{position:absolute;width:100%;pointer-events:none;outline:none;color:var(--date-picker-foreground, #000000);background-color:var(--date-picker-background, #ffffff);border-radius:3px}select.svelte-w239uu:focus+select.dummy-select.svelte-w239uu{border-color:var(--date-picker-highlight-border, #0269f7);box-shadow:0px 0px 0px 2px var(--date-picker-highlight-shadow, rgba(2, 105, 247, 0.4))}select.svelte-w239uu.svelte-w239uu:not(.dummy-select){opacity:0}select.svelte-w239uu.svelte-w239uu{font-size:inherit;font-family:inherit;-webkit-appearance:none;-moz-appearance:none;appearance:none;flex-grow:1;padding:0rem 0.35rem;height:1.5rem;padding-right:1.3rem;margin:0px;border:1px solid rgba(108, 120, 147, 0.3);outline:none;transition:all 80ms cubic-bezier(0.4, 0, 0.2, 1);background-image:none}.header.svelte-w239uu.svelte-w239uu{display:flex;font-weight:600;padding-bottom:2px}.header-cell.svelte-w239uu.svelte-w239uu{width:1.875rem;text-align:center;flex-grow:1}.week.svelte-w239uu.svelte-w239uu{display:flex}.cell.svelte-w239uu.svelte-w239uu{display:flex;align-items:center;justify-content:center;width:2rem;height:1.94rem;flex-grow:1;border-radius:5px;box-sizing:border-box;border:2px solid transparent}.cell.svelte-w239uu.svelte-w239uu:hover{border:1px solid rgba(128, 128, 128, 0.08)}.cell.today.svelte-w239uu.svelte-w239uu{font-weight:600;border:2px solid var(--date-picker-today-border, rgba(128, 128, 128, 0.3))}.cell.svelte-w239uu.svelte-w239uu:hover{background-color:rgba(128, 128, 128, 0.08)}.cell.disabled.svelte-w239uu.svelte-w239uu{visibility:hidden}.cell.disabled.svelte-w239uu.svelte-w239uu:hover{border:none;background-color:transparent}.cell.other-month.svelte-w239uu span.svelte-w239uu{opacity:0.4}.cell.selected.svelte-w239uu.svelte-w239uu{color:var(--date-picker-selected-color, inherit);background:var(--date-picker-selected-background, rgba(2, 105, 247, 0.2));border:2px solid var(--date-picker-highlight-border, #0269f7)}");
    }

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[30] = list[i];
    	child_ctx[32] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[33] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[30] = list[i];
    	child_ctx[37] = i;
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[38] = list[i];
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[38] = list[i];
    	return child_ctx;
    }

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[43] = list[i];
    	child_ctx[37] = i;
    	return child_ctx;
    }

    function get_each_context_6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[43] = list[i];
    	child_ctx[37] = i;
    	return child_ctx;
    }

    // (225:10) {#each iLocale.months as monthName, i}
    function create_each_block_6(ctx) {
    	let option;
    	let t_value = /*monthName*/ ctx[43] + "";
    	let t;
    	let option_disabled_value;

    	return {
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.disabled = option_disabled_value = new Date(/*browseYear*/ ctx[8], /*i*/ ctx[37], getMonthLength(/*browseYear*/ ctx[8], /*i*/ ctx[37]), 23, 59, 59, 999) < /*min*/ ctx[1] || new Date(/*browseYear*/ ctx[8], /*i*/ ctx[37]) > /*max*/ ctx[2];
    			option.__value = /*i*/ ctx[37];
    			option.value = option.__value;
    		},
    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*iLocale*/ 16 && t_value !== (t_value = /*monthName*/ ctx[43] + "")) set_data(t, t_value);

    			if (dirty[0] & /*browseYear, min, max, years*/ 294 && option_disabled_value !== (option_disabled_value = new Date(/*browseYear*/ ctx[8], /*i*/ ctx[37], getMonthLength(/*browseYear*/ ctx[8], /*i*/ ctx[37]), 23, 59, 59, 999) < /*min*/ ctx[1] || new Date(/*browseYear*/ ctx[8], /*i*/ ctx[37]) > /*max*/ ctx[2])) {
    				option.disabled = option_disabled_value;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(option);
    		}
    	};
    }

    // (241:10) {#each iLocale.months as monthName, i}
    function create_each_block_5(ctx) {
    	let option;
    	let t_value = /*monthName*/ ctx[43] + "";
    	let t;
    	let option_selected_value;

    	return {
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*i*/ ctx[37];
    			option.value = option.__value;
    			option.selected = option_selected_value = /*i*/ ctx[37] === /*browseMonth*/ ctx[7];
    		},
    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*iLocale*/ 16 && t_value !== (t_value = /*monthName*/ ctx[43] + "")) set_data(t, t_value);

    			if (dirty[0] & /*browseMonth*/ 128 && option_selected_value !== (option_selected_value = /*i*/ ctx[37] === /*browseMonth*/ ctx[7])) {
    				option.selected = option_selected_value;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(option);
    		}
    	};
    }

    // (255:10) {#each years as v}
    function create_each_block_4(ctx) {
    	let option;
    	let t_value = /*v*/ ctx[38] + "";
    	let t;
    	let option_value_value;

    	return {
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*v*/ ctx[38];
    			option.value = option.__value;
    		},
    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*years*/ 32 && t_value !== (t_value = /*v*/ ctx[38] + "")) set_data(t, t_value);

    			if (dirty[0] & /*years*/ 32 && option_value_value !== (option_value_value = /*v*/ ctx[38])) {
    				option.__value = option_value_value;
    				option.value = option.__value;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(option);
    		}
    	};
    }

    // (261:10) {#each years as v}
    function create_each_block_3(ctx) {
    	let option;
    	let t_value = /*v*/ ctx[38] + "";
    	let t;
    	let option_value_value;
    	let option_selected_value;

    	return {
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*v*/ ctx[38];
    			option.value = option.__value;
    			option.selected = option_selected_value = /*v*/ ctx[38] === /*browseDate*/ ctx[3].getFullYear();
    		},
    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*years*/ 32 && t_value !== (t_value = /*v*/ ctx[38] + "")) set_data(t, t_value);

    			if (dirty[0] & /*years*/ 32 && option_value_value !== (option_value_value = /*v*/ ctx[38])) {
    				option.__value = option_value_value;
    				option.value = option.__value;
    			}

    			if (dirty[0] & /*years, browseDate*/ 40 && option_selected_value !== (option_selected_value = /*v*/ ctx[38] === /*browseDate*/ ctx[3].getFullYear())) {
    				option.selected = option_selected_value;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(option);
    		}
    	};
    }

    // (285:8) {:else}
    function create_else_block$3(ctx) {
    	let div;
    	let t_value = /*iLocale*/ ctx[4].weekdays[/*iLocale*/ ctx[4].weekStartsOn + /*i*/ ctx[37] - 7] + "";
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(t_value);
    			attr(div, "class", "header-cell svelte-w239uu");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*iLocale*/ 16 && t_value !== (t_value = /*iLocale*/ ctx[4].weekdays[/*iLocale*/ ctx[4].weekStartsOn + /*i*/ ctx[37] - 7] + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (283:8) {#if i + iLocale.weekStartsOn < 7}
    function create_if_block$7(ctx) {
    	let div;
    	let t_value = /*iLocale*/ ctx[4].weekdays[/*iLocale*/ ctx[4].weekStartsOn + /*i*/ ctx[37]] + "";
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(t_value);
    			attr(div, "class", "header-cell svelte-w239uu");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*iLocale*/ 16 && t_value !== (t_value = /*iLocale*/ ctx[4].weekdays[/*iLocale*/ ctx[4].weekStartsOn + /*i*/ ctx[37]] + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (282:6) {#each Array(7) as _, i}
    function create_each_block_2(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*i*/ ctx[37] + /*iLocale*/ ctx[4].weekStartsOn < 7) return create_if_block$7;
    		return create_else_block$3;
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

    // (293:8) {#each calendarDays.slice(weekIndex * 7, weekIndex * 7 + 7) as calendarDay}
    function create_each_block_1(ctx) {
    	let div;
    	let span;
    	let t_value = /*calendarDay*/ ctx[33].number + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[23](/*calendarDay*/ ctx[33]);
    	}

    	return {
    		c() {
    			div = element("div");
    			span = element("span");
    			t = text(t_value);
    			attr(span, "class", "svelte-w239uu");
    			attr(div, "class", "cell svelte-w239uu");
    			toggle_class(div, "disabled", !dayIsInRange(/*calendarDay*/ ctx[33], /*min*/ ctx[1], /*max*/ ctx[2]));
    			toggle_class(div, "selected", /*value*/ ctx[0] && /*calendarDay*/ ctx[33].year === /*value*/ ctx[0].getFullYear() && /*calendarDay*/ ctx[33].month === /*value*/ ctx[0].getMonth() && /*calendarDay*/ ctx[33].number === /*value*/ ctx[0].getDate());
    			toggle_class(div, "today", /*calendarDay*/ ctx[33].year === /*todayDate*/ ctx[9].getFullYear() && /*calendarDay*/ ctx[33].month === /*todayDate*/ ctx[9].getMonth() && /*calendarDay*/ ctx[33].number === /*todayDate*/ ctx[9].getDate());
    			toggle_class(div, "other-month", /*calendarDay*/ ctx[33].month !== /*browseMonth*/ ctx[7]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, span);
    			append(span, t);

    			if (!mounted) {
    				dispose = listen(div, "click", click_handler_2);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*calendarDays*/ 64 && t_value !== (t_value = /*calendarDay*/ ctx[33].number + "")) set_data(t, t_value);

    			if (dirty[0] & /*calendarDays, min, max*/ 70) {
    				toggle_class(div, "disabled", !dayIsInRange(/*calendarDay*/ ctx[33], /*min*/ ctx[1], /*max*/ ctx[2]));
    			}

    			if (dirty[0] & /*value, calendarDays*/ 65) {
    				toggle_class(div, "selected", /*value*/ ctx[0] && /*calendarDay*/ ctx[33].year === /*value*/ ctx[0].getFullYear() && /*calendarDay*/ ctx[33].month === /*value*/ ctx[0].getMonth() && /*calendarDay*/ ctx[33].number === /*value*/ ctx[0].getDate());
    			}

    			if (dirty[0] & /*calendarDays, todayDate*/ 576) {
    				toggle_class(div, "today", /*calendarDay*/ ctx[33].year === /*todayDate*/ ctx[9].getFullYear() && /*calendarDay*/ ctx[33].month === /*todayDate*/ ctx[9].getMonth() && /*calendarDay*/ ctx[33].number === /*todayDate*/ ctx[9].getDate());
    			}

    			if (dirty[0] & /*calendarDays, browseMonth*/ 192) {
    				toggle_class(div, "other-month", /*calendarDay*/ ctx[33].month !== /*browseMonth*/ ctx[7]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (291:4) {#each Array(6) as _, weekIndex}
    function create_each_block$4(ctx) {
    	let div;
    	let t;
    	let each_value_1 = /*calendarDays*/ ctx[6].slice(/*weekIndex*/ ctx[32] * 7, /*weekIndex*/ ctx[32] * 7 + 7);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	return {
    		c() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			attr(div, "class", "week svelte-w239uu");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*calendarDays, min, max, value, todayDate, browseMonth, selectDay*/ 4807) {
    				each_value_1 = /*calendarDays*/ ctx[6].slice(/*weekIndex*/ ctx[32] * 7, /*weekIndex*/ ctx[32] * 7 + 7);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function create_fragment$b(ctx) {
    	let div5;
    	let div4;
    	let div2;
    	let button0;
    	let t0;
    	let div0;
    	let select0;
    	let t1;
    	let select1;
    	let t2;
    	let svg1;
    	let path1;
    	let t3;
    	let div1;
    	let select2;
    	let t4;
    	let select3;
    	let t5;
    	let svg2;
    	let path2;
    	let t6;
    	let button1;
    	let t7;
    	let div3;
    	let t8;
    	let mounted;
    	let dispose;
    	let each_value_6 = /*iLocale*/ ctx[4].months;
    	let each_blocks_5 = [];

    	for (let i = 0; i < each_value_6.length; i += 1) {
    		each_blocks_5[i] = create_each_block_6(get_each_context_6(ctx, each_value_6, i));
    	}

    	let each_value_5 = /*iLocale*/ ctx[4].months;
    	let each_blocks_4 = [];

    	for (let i = 0; i < each_value_5.length; i += 1) {
    		each_blocks_4[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
    	}

    	let each_value_4 = /*years*/ ctx[5];
    	let each_blocks_3 = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks_3[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	let each_value_3 = /*years*/ ctx[5];
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_2[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value_2 = Array(7);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_1[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value = Array(6);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	return {
    		c() {
    			div5 = element("div");
    			div4 = element("div");
    			div2 = element("div");
    			button0 = element("button");
    			button0.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="svelte-w239uu"><path d="M5 3l3.057-3 11.943 12-11.943 12-3.057-3 9-9z" transform="rotate(180, 12, 12)"></path></svg>`;
    			t0 = space();
    			div0 = element("div");
    			select0 = element("select");

    			for (let i = 0; i < each_blocks_5.length; i += 1) {
    				each_blocks_5[i].c();
    			}

    			t1 = space();
    			select1 = element("select");

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				each_blocks_4[i].c();
    			}

    			t2 = space();
    			svg1 = svg_element("svg");
    			path1 = svg_element("path");
    			t3 = space();
    			div1 = element("div");
    			select2 = element("select");

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			t4 = space();
    			select3 = element("select");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t5 = space();
    			svg2 = svg_element("svg");
    			path2 = svg_element("path");
    			t6 = space();
    			button1 = element("button");
    			button1.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="svelte-w239uu"><path d="M5 3l3.057-3 11.943 12-11.943 12-3.057-3 9-9z"></path></svg>`;
    			t7 = space();
    			div3 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t8 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(button0, "type", "button");
    			attr(button0, "class", "page-button svelte-w239uu");
    			attr(button0, "tabindex", "-1");
    			attr(select0, "class", "svelte-w239uu");
    			attr(select1, "class", "dummy-select svelte-w239uu");
    			attr(select1, "tabindex", "-1");
    			attr(path1, "d", "M6 0l12 12-12 12z");
    			attr(path1, "transform", "rotate(90, 12, 12)");
    			attr(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg1, "width", "24");
    			attr(svg1, "height", "24");
    			attr(svg1, "viewBox", "0 0 24 24");
    			attr(svg1, "class", "svelte-w239uu");
    			attr(div0, "class", "dropdown month svelte-w239uu");
    			attr(select2, "class", "svelte-w239uu");
    			attr(select3, "class", "dummy-select svelte-w239uu");
    			attr(select3, "tabindex", "-1");
    			attr(path2, "d", "M6 0l12 12-12 12z");
    			attr(path2, "transform", "rotate(90, 12, 12)");
    			attr(svg2, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg2, "width", "24");
    			attr(svg2, "height", "24");
    			attr(svg2, "viewBox", "0 0 24 24");
    			attr(svg2, "class", "svelte-w239uu");
    			attr(div1, "class", "dropdown year svelte-w239uu");
    			attr(button1, "type", "button");
    			attr(button1, "class", "page-button svelte-w239uu");
    			attr(button1, "tabindex", "-1");
    			attr(div2, "class", "top svelte-w239uu");
    			attr(div3, "class", "header svelte-w239uu");
    			attr(div4, "class", "tab-container svelte-w239uu");
    			attr(div4, "tabindex", "-1");
    			attr(div5, "class", "date-time-picker svelte-w239uu");
    			attr(div5, "tabindex", "0");
    		},
    		m(target, anchor) {
    			insert(target, div5, anchor);
    			append(div5, div4);
    			append(div4, div2);
    			append(div2, button0);
    			append(div2, t0);
    			append(div2, div0);
    			append(div0, select0);

    			for (let i = 0; i < each_blocks_5.length; i += 1) {
    				each_blocks_5[i].m(select0, null);
    			}

    			select_option(select0, /*browseMonth*/ ctx[7]);
    			append(div0, t1);
    			append(div0, select1);

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				each_blocks_4[i].m(select1, null);
    			}

    			append(div0, t2);
    			append(div0, svg1);
    			append(svg1, path1);
    			append(div2, t3);
    			append(div2, div1);
    			append(div1, select2);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].m(select2, null);
    			}

    			select_option(select2, /*browseYear*/ ctx[8]);
    			append(div1, t4);
    			append(div1, select3);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(select3, null);
    			}

    			append(div1, t5);
    			append(div1, svg2);
    			append(svg2, path2);
    			append(div2, t6);
    			append(div2, button1);
    			append(div4, t7);
    			append(div4, div3);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div3, null);
    			}

    			append(div4, t8);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div4, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", /*click_handler*/ ctx[19]),
    					listen(select0, "keydown", /*monthKeydown*/ ctx[14]),
    					listen(select0, "input", /*input_handler*/ ctx[20]),
    					listen(select2, "input", /*input_handler_1*/ ctx[21]),
    					listen(select2, "keydown", /*yearKeydown*/ ctx[13]),
    					listen(button1, "click", /*click_handler_1*/ ctx[22]),
    					listen(div5, "focusout", /*focusout_handler*/ ctx[18]),
    					listen(div5, "keydown", /*keydown*/ ctx[15])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*browseYear, min, max, iLocale*/ 278) {
    				each_value_6 = /*iLocale*/ ctx[4].months;
    				let i;

    				for (i = 0; i < each_value_6.length; i += 1) {
    					const child_ctx = get_each_context_6(ctx, each_value_6, i);

    					if (each_blocks_5[i]) {
    						each_blocks_5[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_5[i] = create_each_block_6(child_ctx);
    						each_blocks_5[i].c();
    						each_blocks_5[i].m(select0, null);
    					}
    				}

    				for (; i < each_blocks_5.length; i += 1) {
    					each_blocks_5[i].d(1);
    				}

    				each_blocks_5.length = each_value_6.length;
    			}

    			if (dirty[0] & /*browseMonth*/ 128) {
    				select_option(select0, /*browseMonth*/ ctx[7]);
    			}

    			if (dirty[0] & /*browseMonth, iLocale*/ 144) {
    				each_value_5 = /*iLocale*/ ctx[4].months;
    				let i;

    				for (i = 0; i < each_value_5.length; i += 1) {
    					const child_ctx = get_each_context_5(ctx, each_value_5, i);

    					if (each_blocks_4[i]) {
    						each_blocks_4[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_4[i] = create_each_block_5(child_ctx);
    						each_blocks_4[i].c();
    						each_blocks_4[i].m(select1, null);
    					}
    				}

    				for (; i < each_blocks_4.length; i += 1) {
    					each_blocks_4[i].d(1);
    				}

    				each_blocks_4.length = each_value_5.length;
    			}

    			if (dirty[0] & /*years*/ 32) {
    				each_value_4 = /*years*/ ctx[5];
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks_3[i]) {
    						each_blocks_3[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_3[i] = create_each_block_4(child_ctx);
    						each_blocks_3[i].c();
    						each_blocks_3[i].m(select2, null);
    					}
    				}

    				for (; i < each_blocks_3.length; i += 1) {
    					each_blocks_3[i].d(1);
    				}

    				each_blocks_3.length = each_value_4.length;
    			}

    			if (dirty[0] & /*browseYear, years*/ 288) {
    				select_option(select2, /*browseYear*/ ctx[8]);
    			}

    			if (dirty[0] & /*years, browseDate*/ 40) {
    				each_value_3 = /*years*/ ctx[5];
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_3(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(select3, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_3.length;
    			}

    			if (dirty[0] & /*iLocale*/ 16) {
    				each_value_2 = Array(7);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_2(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div3, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_2.length;
    			}

    			if (dirty[0] & /*calendarDays, min, max, value, todayDate, browseMonth, selectDay*/ 4807) {
    				each_value = Array(6);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div4, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div5);
    			destroy_each(each_blocks_5, detaching);
    			destroy_each(each_blocks_4, detaching);
    			destroy_each(each_blocks_3, detaching);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function cloneDate(d) {
    	return new Date(d.getTime());
    }

    function clamp(d, min, max) {
    	if (d > max) {
    		return cloneDate(max);
    	} else if (d < min) {
    		return cloneDate(min);
    	} else {
    		return cloneDate(d);
    	}
    }

    function dayIsInRange(calendarDay, min, max) {
    	const date = new Date(calendarDay.year, calendarDay.month, calendarDay.number);
    	const minDate = new Date(min.getFullYear(), min.getMonth(), min.getDate());
    	const maxDate = new Date(max.getFullYear(), max.getMonth(), max.getDate());
    	return date >= minDate && date <= maxDate;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let iLocale;
    	let browseYear;
    	let browseMonth;
    	let calendarDays;
    	const dispatch = createEventDispatcher();
    	let { value = null } = $$props;

    	function setValue(d) {
    		if (d.getTime() !== (value === null || value === void 0
    		? void 0
    		: value.getTime())) {
    			$$invalidate(3, browseDate = clamp(d, min, max));
    			$$invalidate(0, value = cloneDate(browseDate));
    		}
    	}

    	function browse(d) {
    		$$invalidate(3, browseDate = clamp(d, min, max));

    		if (!browseWithoutSelecting && value) {
    			setValue(browseDate);
    		}
    	}

    	const todayDate = new Date();

    	/** Default Date to use */
    	const defaultDate = new Date();

    	let { min = new Date(defaultDate.getFullYear() - 20, 0, 1) } = $$props;
    	let { max = new Date(defaultDate.getFullYear(), 11, 31, 23, 59, 59, 999) } = $$props;

    	/** The date shown in the popup when none is selected */
    	let browseDate = value
    	? cloneDate(value)
    	: cloneDate(clamp(defaultDate, min, max));

    	let years = getYears(min, max);

    	function getYears(min, max) {
    		let years = [];

    		for (let i = min.getFullYear(); i <= max.getFullYear(); i++) {
    			years.push(i);
    		}

    		return years;
    	}

    	let { locale = {} } = $$props;
    	let { browseWithoutSelecting = false } = $$props;

    	function setYear(newYear) {
    		browseDate.setFullYear(newYear);
    		browse(browseDate);
    	}

    	function setMonth(newMonth) {
    		let newYear = browseDate.getFullYear();

    		if (newMonth === 12) {
    			newMonth = 0;
    			newYear++;
    		} else if (newMonth === -1) {
    			newMonth = 11;
    			newYear--;
    		}

    		const maxDate = getMonthLength(newYear, newMonth);
    		const newDate = Math.min(browseDate.getDate(), maxDate);
    		browse(new Date(newYear, newMonth, newDate, browseDate.getHours(), browseDate.getMinutes(), browseDate.getSeconds(), browseDate.getMilliseconds()));
    	}

    	function selectDay(calendarDay) {
    		if (dayIsInRange(calendarDay, min, max)) {
    			browseDate.setFullYear(0);
    			browseDate.setMonth(0);
    			browseDate.setDate(1);
    			browseDate.setFullYear(calendarDay.year);
    			browseDate.setMonth(calendarDay.month);
    			browseDate.setDate(calendarDay.number);
    			setValue(browseDate);
    			dispatch('select');
    		}
    	}

    	function shiftKeydown(e) {
    		if (e.shiftKey && e.key === 'ArrowUp') {
    			setYear(browseDate.getFullYear() - 1);
    		} else if (e.shiftKey && e.key === 'ArrowDown') {
    			setYear(browseDate.getFullYear() + 1);
    		} else if (e.shiftKey && e.key === 'ArrowLeft') {
    			setMonth(browseDate.getMonth() - 1);
    		} else if (e.shiftKey && e.key === 'ArrowRight') {
    			setMonth(browseDate.getMonth() + 1);
    		} else {
    			return false;
    		}

    		e.preventDefault();
    		return true;
    	}

    	function yearKeydown(e) {
    		let shift = e.shiftKey || e.altKey;

    		if (shift) {
    			shiftKeydown(e);
    			return;
    		} else if (e.key === 'ArrowUp') {
    			setYear(browseDate.getFullYear() - 1);
    		} else if (e.key === 'ArrowDown') {
    			setYear(browseDate.getFullYear() + 1);
    		} else if (e.key === 'ArrowLeft') {
    			setMonth(browseDate.getMonth() - 1);
    		} else if (e.key === 'ArrowRight') {
    			setMonth(browseDate.getMonth() + 1);
    		} else {
    			shiftKeydown(e);
    			return;
    		}

    		e.preventDefault();
    	}

    	function monthKeydown(e) {
    		let shift = e.shiftKey || e.altKey;

    		if (shift) {
    			shiftKeydown(e);
    			return;
    		} else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    			setMonth(browseDate.getMonth() - 1);
    		} else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    			setMonth(browseDate.getMonth() + 1);
    		} else {
    			shiftKeydown(e);
    			return;
    		}

    		e.preventDefault();
    	}

    	function keydown(e) {
    		var _a;
    		let shift = e.shiftKey || e.altKey;

    		if (((_a = e.target) === null || _a === void 0
    		? void 0
    		: _a.tagName) === 'SELECT') {
    			return;
    		}

    		if (shift) {
    			shiftKeydown(e);
    			return;
    		} else if (e.key === 'ArrowUp') {
    			browseDate.setDate(browseDate.getDate() - 7);
    			setValue(browseDate);
    		} else if (e.key === 'ArrowDown') {
    			browseDate.setDate(browseDate.getDate() + 7);
    			setValue(browseDate);
    		} else if (e.key === 'ArrowLeft') {
    			browseDate.setDate(browseDate.getDate() - 1);
    			setValue(browseDate);
    		} else if (e.key === 'ArrowRight') {
    			browseDate.setDate(browseDate.getDate() + 1);
    			setValue(browseDate);
    		} else if (e.key === 'Enter') {
    			setValue(browseDate);
    			dispatch('select');
    		} else {
    			return;
    		}

    		e.preventDefault();
    	}

    	function focusout_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	const click_handler = () => setMonth(browseDate.getMonth() - 1);
    	const input_handler = e => setMonth(parseInt(e.currentTarget.value));
    	const input_handler_1 = e => setYear(parseInt(e.currentTarget.value));
    	const click_handler_1 = () => setMonth(browseDate.getMonth() + 1);
    	const click_handler_2 = calendarDay => selectDay(calendarDay);

    	$$self.$$set = $$props => {
    		if ('value' in $$props) $$invalidate(0, value = $$props.value);
    		if ('min' in $$props) $$invalidate(1, min = $$props.min);
    		if ('max' in $$props) $$invalidate(2, max = $$props.max);
    		if ('locale' in $$props) $$invalidate(16, locale = $$props.locale);
    		if ('browseWithoutSelecting' in $$props) $$invalidate(17, browseWithoutSelecting = $$props.browseWithoutSelecting);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*value, max, min*/ 7) {
    			if (value && value > max) {
    				setValue(max);
    			} else if (value && value < min) {
    				setValue(min);
    			}
    		}

    		if ($$self.$$.dirty[0] & /*browseDate, value, browseWithoutSelecting*/ 131081) {
    			if (browseDate.getTime() !== (value === null || value === void 0
    			? void 0
    			: value.getTime()) && !browseWithoutSelecting) {
    				$$invalidate(3, browseDate = value ? cloneDate(value) : browseDate);
    			}
    		}

    		if ($$self.$$.dirty[0] & /*min, max*/ 6) {
    			$$invalidate(5, years = getYears(min, max));
    		}

    		if ($$self.$$.dirty[0] & /*locale*/ 65536) {
    			$$invalidate(4, iLocale = getInnerLocale(locale));
    		}

    		if ($$self.$$.dirty[0] & /*browseDate*/ 8) {
    			$$invalidate(8, browseYear = browseDate.getFullYear());
    		}

    		if ($$self.$$.dirty[0] & /*browseDate*/ 8) {
    			$$invalidate(7, browseMonth = browseDate.getMonth());
    		}

    		if ($$self.$$.dirty[0] & /*browseDate, iLocale*/ 24) {
    			$$invalidate(6, calendarDays = getCalendarDays(browseDate, iLocale.weekStartsOn));
    		}
    	};

    	return [
    		value,
    		min,
    		max,
    		browseDate,
    		iLocale,
    		years,
    		calendarDays,
    		browseMonth,
    		browseYear,
    		todayDate,
    		setYear,
    		setMonth,
    		selectDay,
    		yearKeydown,
    		monthKeydown,
    		keydown,
    		locale,
    		browseWithoutSelecting,
    		focusout_handler,
    		click_handler,
    		input_handler,
    		input_handler_1,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class DatePicker extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$b,
    			create_fragment$b,
    			safe_not_equal,
    			{
    				value: 0,
    				min: 1,
    				max: 2,
    				locale: 16,
    				browseWithoutSelecting: 17
    			},
    			add_css$8,
    			[-1, -1]
    		);
    	}
    }

    function cubicInOut(t) {
        return t < 0.5 ? 4.0 * t * t * t : 0.5 * Math.pow(2.0 * t - 2.0, 3.0) + 1.0;
    }
    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
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

    /** Parse a string according to the supplied format tokens. Returns a date if successful, and the missing punctuation if there is any that should be after the string */
    function parse(str, tokens, baseDate) {
        let missingPunctuation = '';
        let valid = true;
        baseDate = baseDate || new Date(2020, 0, 1, 0, 0, 0, 0);
        let year = baseDate.getFullYear();
        let month = baseDate.getMonth();
        let day = baseDate.getDate();
        let hours = baseDate.getHours();
        let minutes = baseDate.getMinutes();
        let seconds = baseDate.getSeconds();
        const ms = baseDate.getMilliseconds();
        function parseString(token) {
            for (let i = 0; i < token.length; i++) {
                if (str.startsWith(token[i])) {
                    str = str.slice(1);
                }
                else {
                    valid = false;
                    if (str.length === 0)
                        missingPunctuation = token.slice(i);
                    return;
                }
            }
        }
        function parseUint(pattern, min, max) {
            const matches = str.match(pattern);
            if (matches?.[0]) {
                str = str.slice(matches[0].length);
                const n = parseInt(matches[0]);
                if (n > max || n < min) {
                    valid = false;
                    return null;
                }
                else {
                    return n;
                }
            }
            else {
                valid = false;
                return null;
            }
        }
        function parseToken(token) {
            if (typeof token === 'string') {
                parseString(token);
            }
            else if (token.id === 'yyyy') {
                const value = parseUint(/^[0-9]{4}/, 0, 9999);
                if (value !== null)
                    year = value;
            }
            else if (token.id === 'MM') {
                const value = parseUint(/^[0-9]{2}/, 1, 12);
                if (value !== null)
                    month = value - 1;
            }
            else if (token.id === 'dd') {
                const value = parseUint(/^[0-9]{2}/, 1, 31);
                if (value !== null)
                    day = value;
            }
            else if (token.id === 'HH') {
                const value = parseUint(/^[0-9]{2}/, 0, 23);
                if (value !== null)
                    hours = value;
            }
            else if (token.id === 'mm') {
                const value = parseUint(/^[0-9]{2}/, 0, 59);
                if (value !== null)
                    minutes = value;
            }
            else if (token.id === 'ss') {
                const value = parseUint(/^[0-9]{2}/, 0, 59);
                if (value !== null)
                    seconds = value;
            }
        }
        for (const token of tokens) {
            parseToken(token);
            if (!valid)
                break;
        }
        const monthLength = getMonthLength(year, month);
        if (day > monthLength) {
            valid = false;
        }
        return {
            date: valid ? new Date(year, month, day, hours, minutes, seconds, ms) : null,
            missingPunctuation: missingPunctuation,
        };
    }
    function twoDigit(value) {
        return ('0' + value.toString()).slice(-2);
    }
    const ruleTokens = [
        {
            id: 'yyyy',
            toString: (d) => d.getFullYear().toString(),
        },
        {
            id: 'MM',
            toString: (d) => twoDigit(d.getMonth() + 1),
        },
        {
            id: 'dd',
            toString: (d) => twoDigit(d.getDate()),
        },
        {
            id: 'HH',
            toString: (d) => twoDigit(d.getHours()),
        },
        {
            id: 'mm',
            toString: (d) => twoDigit(d.getMinutes()),
        },
        {
            id: 'ss',
            toString: (d) => twoDigit(d.getSeconds()),
        },
    ];
    function parseRule(s) {
        for (const token of ruleTokens) {
            if (s.startsWith(token.id)) {
                return token;
            }
        }
    }
    function createFormat(s) {
        const tokens = [];
        while (s.length > 0) {
            const token = parseRule(s);
            if (token) {
                // parsed a token like "yyyy"
                tokens.push(token);
                s = s.slice(token.id.length);
            }
            else if (typeof tokens[tokens.length - 1] === 'string') {
                // last token is a string token, so append to it
                tokens[tokens.length - 1] += s[0];
                s = s.slice(1);
            }
            else {
                // add string token
                tokens.push(s[0]);
                s = s.slice(1);
            }
        }
        return tokens;
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

    /* src/components/date-picker-svelte/DateInput.svelte generated by Svelte v3.52.0 */

    function add_css$7(target) {
    	append_styles(target, "svelte-oyazrd", ".date-time-field.svelte-oyazrd{position:relative}input.svelte-oyazrd{color:var(--date-picker-foreground, #000000);background:var(--date-picker-background, #ffffff);min-width:0px;box-sizing:border-box;padding:4px 6px;margin:0px;border:1px solid rgba(103, 113, 137, 0.3);border-radius:3px;width:var(--date-input-width, 150px);outline:none;transition:all 80ms cubic-bezier(0.4, 0, 0.2, 1)}input.svelte-oyazrd:focus{border-color:var(--date-picker-highlight-border, #0269f7);box-shadow:0px 0px 0px 2px var(--date-picker-highlight-shadow, rgba(2, 105, 247, 0.4))}input.svelte-oyazrd:disabled{opacity:0.5}.invalid.svelte-oyazrd{border:1px solid rgba(249, 47, 114, 0.5);background-color:rgba(249, 47, 114, 0.1)}.invalid.svelte-oyazrd:focus{border-color:#f92f72;box-shadow:0px 0px 0px 2px rgba(249, 47, 114, 0.5)}.picker.svelte-oyazrd{display:none;position:absolute;margin-top:1px;margin-left:-80px;z-index:10}.picker.visible.svelte-oyazrd{display:block}");
    }

    // (147:2) {#if visible && !disabled}
    function create_if_block$6(ctx) {
    	let div;
    	let datetimepicker;
    	let updating_value;
    	let div_transition;
    	let current;

    	function datetimepicker_value_binding(value) {
    		/*datetimepicker_value_binding*/ ctx[25](value);
    	}

    	let datetimepicker_props = {
    		min: /*min*/ ctx[3],
    		max: /*max*/ ctx[4],
    		locale: /*locale*/ ctx[8],
    		browseWithoutSelecting: /*browseWithoutSelecting*/ ctx[9]
    	};

    	if (/*$store*/ ctx[10] !== void 0) {
    		datetimepicker_props.value = /*$store*/ ctx[10];
    	}

    	datetimepicker = new DatePicker({ props: datetimepicker_props });
    	binding_callbacks.push(() => bind(datetimepicker, 'value', datetimepicker_value_binding));
    	datetimepicker.$on("focusout", /*onFocusOut*/ ctx[14]);
    	datetimepicker.$on("select", /*onSelect*/ ctx[16]);

    	return {
    		c() {
    			div = element("div");
    			create_component(datetimepicker.$$.fragment);
    			attr(div, "class", "picker svelte-oyazrd");
    			toggle_class(div, "visible", /*visible*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(datetimepicker, div, null);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const datetimepicker_changes = {};
    			if (dirty[0] & /*min*/ 8) datetimepicker_changes.min = /*min*/ ctx[3];
    			if (dirty[0] & /*max*/ 16) datetimepicker_changes.max = /*max*/ ctx[4];
    			if (dirty[0] & /*locale*/ 256) datetimepicker_changes.locale = /*locale*/ ctx[8];
    			if (dirty[0] & /*browseWithoutSelecting*/ 512) datetimepicker_changes.browseWithoutSelecting = /*browseWithoutSelecting*/ ctx[9];

    			if (!updating_value && dirty[0] & /*$store*/ 1024) {
    				updating_value = true;
    				datetimepicker_changes.value = /*$store*/ ctx[10];
    				add_flush_callback(() => updating_value = false);
    			}

    			datetimepicker.$set(datetimepicker_changes);

    			if (!current || dirty[0] & /*visible*/ 4) {
    				toggle_class(div, "visible", /*visible*/ ctx[2]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(datetimepicker.$$.fragment, local);

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, fly, { duration: 80, easing: cubicInOut, y: -5 }, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(datetimepicker.$$.fragment, local);
    			if (!div_transition) div_transition = create_bidirectional_transition(div, fly, { duration: 80, easing: cubicInOut, y: -5 }, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(datetimepicker);
    			if (detaching && div_transition) div_transition.end();
    		}
    	};
    }

    function create_fragment$a(ctx) {
    	let div;
    	let input_1;
    	let t;
    	let div_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*visible*/ ctx[2] && !/*disabled*/ ctx[6] && create_if_block$6(ctx);

    	return {
    		c() {
    			div = element("div");
    			input_1 = element("input");
    			t = space();
    			if (if_block) if_block.c();
    			attr(input_1, "type", "text");
    			attr(input_1, "placeholder", /*placeholder*/ ctx[5]);
    			input_1.disabled = /*disabled*/ ctx[6];
    			attr(input_1, "class", "svelte-oyazrd");
    			toggle_class(input_1, "invalid", !/*valid*/ ctx[1]);
    			attr(div, "class", div_class_value = "date-time-field " + /*classes*/ ctx[7] + " svelte-oyazrd");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, input_1);
    			set_input_value(input_1, /*text*/ ctx[0]);
    			append(div, t);
    			if (if_block) if_block.m(div, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(input_1, "input", /*input_1_input_handler*/ ctx[22]),
    					listen(input_1, "focus", /*focus_handler*/ ctx[23]),
    					listen(input_1, "mousedown", /*mousedown_handler*/ ctx[24]),
    					listen(input_1, "input", /*input*/ ctx[13]),
    					listen(div, "focusout", /*onFocusOut*/ ctx[14]),
    					listen(div, "keydown", /*keydown*/ ctx[15])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (!current || dirty[0] & /*placeholder*/ 32) {
    				attr(input_1, "placeholder", /*placeholder*/ ctx[5]);
    			}

    			if (!current || dirty[0] & /*disabled*/ 64) {
    				input_1.disabled = /*disabled*/ ctx[6];
    			}

    			if (dirty[0] & /*text*/ 1 && input_1.value !== /*text*/ ctx[0]) {
    				set_input_value(input_1, /*text*/ ctx[0]);
    			}

    			if (!current || dirty[0] & /*valid*/ 2) {
    				toggle_class(input_1, "invalid", !/*valid*/ ctx[1]);
    			}

    			if (/*visible*/ ctx[2] && !/*disabled*/ ctx[6]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*visible, disabled*/ 68) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$6(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty[0] & /*classes*/ 128 && div_class_value !== (div_class_value = "date-time-field " + /*classes*/ ctx[7] + " svelte-oyazrd")) {
    				attr(div, "class", div_class_value);
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
    			if (detaching) detach(div);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let $store;
    	let $innerStore;
    	const dispatch = createEventDispatcher();

    	/** Default date to display in picker before value is assigned */
    	const defaultDate = new Date();

    	// inner date value store for preventing value updates (and also
    	// text updates as a result) when date is unchanged
    	const innerStore = writable(null);

    	component_subscribe($$self, innerStore, value => $$invalidate(27, $innerStore = value));

    	const store = (() => {
    		return {
    			subscribe: innerStore.subscribe,
    			set: d => {
    				if (d === null) {
    					innerStore.set(null);
    					$$invalidate(17, value = d);
    				} else if (d.getTime() !== ($innerStore === null || $innerStore === void 0
    				? void 0
    				: $innerStore.getTime())) {
    					innerStore.set(d);
    					$$invalidate(17, value = d);
    				}
    			}
    		};
    	})();

    	component_subscribe($$self, store, value => $$invalidate(10, $store = value));
    	let { value = null } = $$props;
    	let { min = new Date(defaultDate.getFullYear() - 20, 0, 1) } = $$props;
    	let { max = new Date(defaultDate.getFullYear(), 11, 31, 23, 59, 59, 999) } = $$props;
    	let { placeholder = '2020-12-31 23:00:00' } = $$props;
    	let { valid = true } = $$props;
    	let { disabled = false } = $$props;
    	let { class: classes = '' } = $$props;
    	let { format = 'yyyy-MM-dd HH:mm:ss' } = $$props;
    	let formatTokens = createFormat(format);
    	let { locale = {} } = $$props;

    	function valueUpdate(value, formatTokens) {
    		$$invalidate(0, text = toText(value, formatTokens));
    	}

    	let { text = toText($store, formatTokens) } = $$props;
    	let textHistory = [text, text];
    	let last_valid_text = text;

    	function textUpdate(text, formatTokens) {
    		if (text.length) {
    			const result = parse(text, formatTokens, $store);

    			if (result.date !== null) {
    				$$invalidate(1, valid = true);
    				store.set(result.date);
    			} else {
    				$$invalidate(1, valid = false);
    			}
    		} else {
    			$$invalidate(1, valid = true); // <-- empty string is always valid

    			// value resets to null if you clear the field
    			if (value) {
    				$$invalidate(17, value = null);
    				store.set(null);
    			}
    		}

    		if (valid && text !== last_valid_text) {
    			last_valid_text = text;
    			dispatch('update', { value });
    		}
    	}

    	function input(e) {
    		if (e instanceof InputEvent && e.inputType === 'insertText' && typeof e.data === 'string' && text === textHistory[0] + e.data) {
    			// check for missing punctuation, and add if there is any
    			let result = parse(textHistory[0], formatTokens, $store);

    			if (result.missingPunctuation !== '' && !result.missingPunctuation.startsWith(e.data)) {
    				$$invalidate(0, text = textHistory[0] + result.missingPunctuation + e.data);
    			}
    		}
    	}

    	let { visible = false } = $$props;
    	let { closeOnSelection = false } = $$props;
    	let { browseWithoutSelecting = false } = $$props;

    	// handle on:focusout for parent element. If the parent element loses
    	// focus (e.g input element), visible is set to false
    	function onFocusOut(e) {
    		if ((e === null || e === void 0 ? void 0 : e.currentTarget) instanceof HTMLElement && e.relatedTarget && e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) {
    			return;
    		} else {
    			$$invalidate(2, visible = false);
    		}
    	}

    	function keydown(e) {
    		if (e.key === 'Escape' && visible) {
    			$$invalidate(2, visible = false);
    			e.preventDefault();

    			// When the date picker is open, we prevent 'Escape' from propagating,
    			// so for example a parent modal won't be closed
    			e.stopPropagation();
    		} else if (e.key === 'Enter') {
    			$$invalidate(2, visible = !visible);
    			e.preventDefault();
    		}
    	}

    	function onSelect(e) {
    		dispatch('select', e.detail);

    		if (closeOnSelection) {
    			$$invalidate(2, visible = false);
    		}
    	}

    	function input_1_input_handler() {
    		text = this.value;
    		$$invalidate(0, text);
    	}

    	const focus_handler = () => $$invalidate(2, visible = true);
    	const mousedown_handler = () => $$invalidate(2, visible = true);

    	function datetimepicker_value_binding(value) {
    		$store = value;
    		store.set($store);
    	}

    	$$self.$$set = $$props => {
    		if ('value' in $$props) $$invalidate(17, value = $$props.value);
    		if ('min' in $$props) $$invalidate(3, min = $$props.min);
    		if ('max' in $$props) $$invalidate(4, max = $$props.max);
    		if ('placeholder' in $$props) $$invalidate(5, placeholder = $$props.placeholder);
    		if ('valid' in $$props) $$invalidate(1, valid = $$props.valid);
    		if ('disabled' in $$props) $$invalidate(6, disabled = $$props.disabled);
    		if ('class' in $$props) $$invalidate(7, classes = $$props.class);
    		if ('format' in $$props) $$invalidate(18, format = $$props.format);
    		if ('locale' in $$props) $$invalidate(8, locale = $$props.locale);
    		if ('text' in $$props) $$invalidate(0, text = $$props.text);
    		if ('visible' in $$props) $$invalidate(2, visible = $$props.visible);
    		if ('closeOnSelection' in $$props) $$invalidate(19, closeOnSelection = $$props.closeOnSelection);
    		if ('browseWithoutSelecting' in $$props) $$invalidate(9, browseWithoutSelecting = $$props.browseWithoutSelecting);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*value*/ 131072) {
    			store.set(value);
    		}

    		if ($$self.$$.dirty[0] & /*format*/ 262144) {
    			$$invalidate(20, formatTokens = createFormat(format));
    		}

    		if ($$self.$$.dirty[0] & /*$store, formatTokens*/ 1049600) {
    			valueUpdate($store, formatTokens);
    		}

    		if ($$self.$$.dirty[0] & /*textHistory, text*/ 2097153) {
    			$$invalidate(21, textHistory = [textHistory[1], text]);
    		}

    		if ($$self.$$.dirty[0] & /*text, formatTokens*/ 1048577) {
    			textUpdate(text, formatTokens);
    		}
    	};

    	return [
    		text,
    		valid,
    		visible,
    		min,
    		max,
    		placeholder,
    		disabled,
    		classes,
    		locale,
    		browseWithoutSelecting,
    		$store,
    		innerStore,
    		store,
    		input,
    		onFocusOut,
    		keydown,
    		onSelect,
    		value,
    		format,
    		closeOnSelection,
    		formatTokens,
    		textHistory,
    		input_1_input_handler,
    		focus_handler,
    		mousedown_handler,
    		datetimepicker_value_binding
    	];
    }

    class DateInput extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$a,
    			create_fragment$a,
    			safe_not_equal,
    			{
    				value: 17,
    				min: 3,
    				max: 4,
    				placeholder: 5,
    				valid: 1,
    				disabled: 6,
    				class: 7,
    				format: 18,
    				locale: 8,
    				text: 0,
    				visible: 2,
    				closeOnSelection: 19,
    				browseWithoutSelecting: 9
    			},
    			add_css$7,
    			[-1, -1]
    		);
    	}
    }

    const featuredPosts = writable([]);
    const unfeaturedPosts = writable([]);
    const totalHits = writable(0);
    const analytics = writable([]);
    const frontpageId = writable(0);
    const unique_id = writable(0);
    const show_modal = writable(false);

    /* src/components/Pie.svelte generated by Svelte v3.52.0 */

    function create_fragment$9(ctx) {
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

    function instance$9($$self, $$props, $$invalidate) {
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

    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {
    			size: 0,
    			percent: 6,
    			bgColor: 1,
    			fgColor: 2
    		});
    	}
    }

    /* src/components/AnalyticsGraph.svelte generated by Svelte v3.52.0 */

    function add_css$6(target) {
    	append_styles(target, "svelte-j0cm0n", ".analytics-graph.svelte-j0cm0n{display:flex;flex-direction:column;justify-content:flex-start;align-items:center}");
    }

    // (14:0) {#if (hits_last_hour !== null)}
    function create_if_block$5(ctx) {
    	let div;
    	let pie;
    	let t0;
    	let t1_value = Number(/*hits_last_hour*/ ctx[0]).toLocaleString() + "";
    	let t1;
    	let current;

    	pie = new Pie({
    			props: {
    				size: height,
    				percent: /*hits_last_hour*/ ctx[0] / /*total_hits*/ ctx[1] * 100
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
    			if (dirty & /*hits_last_hour, total_hits*/ 3) pie_changes.percent = /*hits_last_hour*/ ctx[0] / /*total_hits*/ ctx[1] * 100;
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

    function create_fragment$8(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*hits_last_hour*/ ctx[0] !== null && create_if_block$5(ctx);

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
    					if_block = create_if_block$5(ctx);
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

    function instance$8($$self, $$props, $$invalidate) {
    	let { hits_last_hour } = $$props;
    	let { total_hits } = $$props;

    	$$self.$$set = $$props => {
    		if ('hits_last_hour' in $$props) $$invalidate(0, hits_last_hour = $$props.hits_last_hour);
    		if ('total_hits' in $$props) $$invalidate(1, total_hits = $$props.total_hits);
    	};

    	return [hits_last_hour, total_hits];
    }

    class AnalyticsGraph extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { hits_last_hour: 0, total_hits: 1 }, add_css$6);
    	}
    }

    /* src/components/PostRow.svelte generated by Svelte v3.52.0 */

    function add_css$5(target) {
    	append_styles(target, "svelte-1p0azr4", ".column-image.svelte-1p0azr4.svelte-1p0azr4{width:50px}.column-image.svelte-1p0azr4 img.svelte-1p0azr4{width:50px;height:40px;object-fit:cover}.column-title.svelte-1p0azr4.svelte-1p0azr4{width:500px}.badge.svelte-1p0azr4.svelte-1p0azr4{background-color:#0071a1;color:#fff;display:inline-block;padding:0.25em 0.4em;font-size:75%;font-weight:700;line-height:1;text-align:center;white-space:nowrap;vertical-align:baseline;border-radius:0.25rem}.hide-overflow-x.svelte-1p0azr4.svelte-1p0azr4{overflow-x:hidden}");
    }

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    // (12:4) {#if post.image}
    function create_if_block_5(ctx) {
    	let img;
    	let img_src_value;
    	let img_alt_value;

    	return {
    		c() {
    			img = element("img");
    			attr(img, "class", "image svelte-1p0azr4");
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

    // (16:0) {#if (mode=="development")}
    function create_if_block_4$1(ctx) {
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

    // (22:4) {#each post.sections as section}
    function create_each_block$3(ctx) {
    	let span;
    	let t_value = /*section*/ ctx[8] + "";
    	let t;

    	return {
    		c() {
    			span = element("span");
    			t = text(t_value);
    			attr(span, "class", "section badge svelte-1p0azr4");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*post*/ 1 && t_value !== (t_value = /*section*/ ctx[8] + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (30:8) {:else}
    function create_else_block$2(ctx) {
    	let t_value = /*post*/ ctx[0].title + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*post*/ 1 && t_value !== (t_value = /*post*/ ctx[0].title + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (28:8) {#if !post.is_blank}
    function create_if_block_3$1(ctx) {
    	let a;
    	let t_value = /*post*/ ctx[0].title + "";
    	let t;
    	let a_href_value;

    	return {
    		c() {
    			a = element("a");
    			t = text(t_value);
    			attr(a, "class", "row-title");
    			attr(a, "href", a_href_value = /*post*/ ctx[0].edit_link);
    		},
    		m(target, anchor) {
    			insert(target, a, anchor);
    			append(a, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*post*/ 1 && t_value !== (t_value = /*post*/ ctx[0].title + "")) set_data(t, t_value);

    			if (dirty & /*post*/ 1 && a_href_value !== (a_href_value = /*post*/ ctx[0].edit_link)) {
    				attr(a, "href", a_href_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(a);
    		}
    	};
    }

    // (34:4) {#if hovering && !post.is_blank}
    function create_if_block_2$1(ctx) {
    	let p;
    	let a0;
    	let t0;
    	let a0_href_value;
    	let t1;
    	let a1;
    	let t2;
    	let a1_href_value;
    	let p_intro;
    	let p_outro;
    	let current;

    	return {
    		c() {
    			p = element("p");
    			a0 = element("a");
    			t0 = text("View");
    			t1 = text(" \n        | \n        ");
    			a1 = element("a");
    			t2 = text("Edit");
    			attr(a0, "target", "_blank");
    			attr(a0, "href", a0_href_value = /*post*/ ctx[0].link);
    			attr(a0, "rel", "noreferrer");
    			attr(a1, "target", "_blank");
    			attr(a1, "href", a1_href_value = /*post*/ ctx[0].edit_link);
    			attr(a1, "rel", "noreferrer");
    		},
    		m(target, anchor) {
    			insert(target, p, anchor);
    			append(p, a0);
    			append(a0, t0);
    			append(p, t1);
    			append(p, a1);
    			append(a1, t2);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (!current || dirty & /*post*/ 1 && a0_href_value !== (a0_href_value = /*post*/ ctx[0].link)) {
    				attr(a0, "href", a0_href_value);
    			}

    			if (!current || dirty & /*post*/ 1 && a1_href_value !== (a1_href_value = /*post*/ ctx[0].edit_link)) {
    				attr(a1, "href", a1_href_value);
    			}
    		},
    		i(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (p_outro) p_outro.end(1);
    				p_intro = create_in_transition(p, fade, {});
    				p_intro.start();
    			});

    			current = true;
    		},
    		o(local) {
    			if (p_intro) p_intro.invalidate();
    			p_outro = create_out_transition(p, fade, {});
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(p);
    			if (detaching && p_outro) p_outro.end();
    		}
    	};
    }

    // (44:4) {#if !post.is_blank}
    function create_if_block_1$2(ctx) {
    	let t_value = /*post*/ ctx[0].date_published + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*post*/ 1 && t_value !== (t_value = /*post*/ ctx[0].date_published + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (49:4) {#if analytics.find(analytic => post.id === analytic.post_id)}
    function create_if_block$4(ctx) {
    	let analyticsgraph;
    	let current;

    	analyticsgraph = new AnalyticsGraph({
    			props: {
    				hits_last_hour: /*analytics*/ ctx[3].find(/*func_1*/ ctx[7]).hits_last_hour,
    				total_hits: /*total_hits*/ ctx[2]
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
    			if (dirty & /*analytics, post*/ 9) analyticsgraph_changes.hits_last_hour = /*analytics*/ ctx[3].find(/*func_1*/ ctx[7]).hits_last_hour;
    			if (dirty & /*total_hits*/ 4) analyticsgraph_changes.total_hits = /*total_hits*/ ctx[2];
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

    function create_fragment$7(ctx) {
    	let td0;
    	let t0;
    	let t1;
    	let td1;
    	let t2;
    	let td2;
    	let strong;
    	let t3;
    	let t4;
    	let td3;
    	let t5_value = /*post*/ ctx[0].author + "";
    	let t5;
    	let t6;
    	let td4;
    	let t7;
    	let td5;
    	let show_if = /*analytics*/ ctx[3].find(/*func*/ ctx[6]);
    	let current;
    	let if_block0 = /*post*/ ctx[0].image && create_if_block_5(ctx);
    	let if_block1 = /*mode*/ ctx[4] == "development" && create_if_block_4$1(ctx);
    	let each_value = /*post*/ ctx[0].sections;
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	function select_block_type(ctx, dirty) {
    		if (!/*post*/ ctx[0].is_blank) return create_if_block_3$1;
    		return create_else_block$2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block2 = current_block_type(ctx);
    	let if_block3 = /*hovering*/ ctx[1] && !/*post*/ ctx[0].is_blank && create_if_block_2$1(ctx);
    	let if_block4 = !/*post*/ ctx[0].is_blank && create_if_block_1$2(ctx);
    	let if_block5 = show_if && create_if_block$4(ctx);

    	return {
    		c() {
    			td0 = element("td");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			td1 = element("td");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			td2 = element("td");
    			strong = element("strong");
    			if_block2.c();
    			t3 = space();
    			if (if_block3) if_block3.c();
    			t4 = space();
    			td3 = element("td");
    			t5 = text(t5_value);
    			t6 = space();
    			td4 = element("td");
    			if (if_block4) if_block4.c();
    			t7 = space();
    			td5 = element("td");
    			if (if_block5) if_block5.c();
    			attr(td0, "class", "column-image svelte-1p0azr4");
    			attr(td1, "class", "column-section hide-overflow-x svelte-1p0azr4");
    			attr(td2, "class", "column-title svelte-1p0azr4");
    			attr(td3, "class", "column-author");
    			attr(td4, "class", "column-published");
    			attr(td5, "class", "column-analytics");
    		},
    		m(target, anchor) {
    			insert(target, td0, anchor);
    			if (if_block0) if_block0.m(td0, null);
    			insert(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, t1, anchor);
    			insert(target, td1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(td1, null);
    			}

    			insert(target, t2, anchor);
    			insert(target, td2, anchor);
    			append(td2, strong);
    			if_block2.m(strong, null);
    			append(td2, t3);
    			if (if_block3) if_block3.m(td2, null);
    			insert(target, t4, anchor);
    			insert(target, td3, anchor);
    			append(td3, t5);
    			insert(target, t6, anchor);
    			insert(target, td4, anchor);
    			if (if_block4) if_block4.m(td4, null);
    			insert(target, t7, anchor);
    			insert(target, td5, anchor);
    			if (if_block5) if_block5.m(td5, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*post*/ ctx[0].image) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_5(ctx);
    					if_block0.c();
    					if_block0.m(td0, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*mode*/ ctx[4] == "development") if_block1.p(ctx, dirty);

    			if (dirty & /*post*/ 1) {
    				each_value = /*post*/ ctx[0].sections;
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(td1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(strong, null);
    				}
    			}

    			if (/*hovering*/ ctx[1] && !/*post*/ ctx[0].is_blank) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);

    					if (dirty & /*hovering, post*/ 3) {
    						transition_in(if_block3, 1);
    					}
    				} else {
    					if_block3 = create_if_block_2$1(ctx);
    					if_block3.c();
    					transition_in(if_block3, 1);
    					if_block3.m(td2, null);
    				}
    			} else if (if_block3) {
    				group_outros();

    				transition_out(if_block3, 1, 1, () => {
    					if_block3 = null;
    				});

    				check_outros();
    			}

    			if ((!current || dirty & /*post*/ 1) && t5_value !== (t5_value = /*post*/ ctx[0].author + "")) set_data(t5, t5_value);

    			if (!/*post*/ ctx[0].is_blank) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block_1$2(ctx);
    					if_block4.c();
    					if_block4.m(td4, null);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (dirty & /*analytics, post*/ 9) show_if = /*analytics*/ ctx[3].find(/*func*/ ctx[6]);

    			if (show_if) {
    				if (if_block5) {
    					if_block5.p(ctx, dirty);

    					if (dirty & /*analytics, post*/ 9) {
    						transition_in(if_block5, 1);
    					}
    				} else {
    					if_block5 = create_if_block$4(ctx);
    					if_block5.c();
    					transition_in(if_block5, 1);
    					if_block5.m(td5, null);
    				}
    			} else if (if_block5) {
    				group_outros();

    				transition_out(if_block5, 1, 1, () => {
    					if_block5 = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block3);
    			transition_in(if_block5);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block3);
    			transition_out(if_block5);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(td0);
    			if (if_block0) if_block0.d();
    			if (detaching) detach(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach(t1);
    			if (detaching) detach(td1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(t2);
    			if (detaching) detach(td2);
    			if_block2.d();
    			if (if_block3) if_block3.d();
    			if (detaching) detach(t4);
    			if (detaching) detach(td3);
    			if (detaching) detach(t6);
    			if (detaching) detach(td4);
    			if (if_block4) if_block4.d();
    			if (detaching) detach(t7);
    			if (detaching) detach(td5);
    			if (if_block5) if_block5.d();
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	const mode = "production";
    	let { post } = $$props;
    	let { hovering } = $$props;
    	let { total_hits } = $$props;
    	let { analytics } = $$props;
    	let { index } = $$props;
    	const func = analytic => post.id === analytic.post_id;
    	const func_1 = analytic => post.id === analytic.post_id;

    	$$self.$$set = $$props => {
    		if ('post' in $$props) $$invalidate(0, post = $$props.post);
    		if ('hovering' in $$props) $$invalidate(1, hovering = $$props.hovering);
    		if ('total_hits' in $$props) $$invalidate(2, total_hits = $$props.total_hits);
    		if ('analytics' in $$props) $$invalidate(3, analytics = $$props.analytics);
    		if ('index' in $$props) $$invalidate(5, index = $$props.index);
    	};

    	return [post, hovering, total_hits, analytics, mode, index, func, func_1];
    }

    class PostRow extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$7,
    			create_fragment$7,
    			safe_not_equal,
    			{
    				post: 0,
    				hovering: 1,
    				total_hits: 2,
    				analytics: 3,
    				index: 5
    			},
    			add_css$5
    		);
    	}
    }

    /* node_modules/svelte-tooltip/src/SvelteTooltip.svelte generated by Svelte v3.52.0 */

    function add_css$4(target) {
    	append_styles(target, "svelte-16glvw6", ".tooltip-wrapper.svelte-16glvw6.svelte-16glvw6{position:relative;display:inline-block}.tooltip.svelte-16glvw6.svelte-16glvw6{position:absolute;font-family:inherit;display:inline-block;white-space:nowrap;color:inherit;opacity:0;visibility:hidden;transition:opacity 150ms, visibility 150ms}.default-tip.svelte-16glvw6.svelte-16glvw6{display:inline-block;padding:8px 16px;border-radius:6px;color:inherit}.tooltip.top.svelte-16glvw6.svelte-16glvw6{left:50%;transform:translate(-50%, -100%);margin-top:-8px}.tooltip.bottom.svelte-16glvw6.svelte-16glvw6{left:50%;bottom:0;transform:translate(-50%, 100%);margin-bottom:-8px}.tooltip.left.svelte-16glvw6.svelte-16glvw6{left:0;transform:translateX(-100%);margin-left:-8px}.tooltip.right.svelte-16glvw6.svelte-16glvw6{right:0;transform:translateX(100%);margin-right:-8px}.tooltip.active.svelte-16glvw6.svelte-16glvw6{opacity:1;visibility:initial}.tooltip-slot.svelte-16glvw6:hover+.tooltip.svelte-16glvw6{opacity:1;visibility:initial}");
    }

    const get_custom_tip_slot_changes = dirty => ({});
    const get_custom_tip_slot_context = ctx => ({});

    // (85:4) {:else}
    function create_else_block$1(ctx) {
    	let current;
    	const custom_tip_slot_template = /*#slots*/ ctx[9]["custom-tip"];
    	const custom_tip_slot = create_slot(custom_tip_slot_template, ctx, /*$$scope*/ ctx[8], get_custom_tip_slot_context);

    	return {
    		c() {
    			if (custom_tip_slot) custom_tip_slot.c();
    		},
    		m(target, anchor) {
    			if (custom_tip_slot) {
    				custom_tip_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (custom_tip_slot) {
    				if (custom_tip_slot.p && (!current || dirty & /*$$scope*/ 256)) {
    					update_slot_base(
    						custom_tip_slot,
    						custom_tip_slot_template,
    						ctx,
    						/*$$scope*/ ctx[8],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[8])
    						: get_slot_changes(custom_tip_slot_template, /*$$scope*/ ctx[8], dirty, get_custom_tip_slot_changes),
    						get_custom_tip_slot_context
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(custom_tip_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(custom_tip_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (custom_tip_slot) custom_tip_slot.d(detaching);
    		}
    	};
    }

    // (83:4) {#if tip}
    function create_if_block$3(ctx) {
    	let div;
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(/*tip*/ ctx[0]);
    			attr(div, "class", "default-tip svelte-16glvw6");
    			attr(div, "style", /*style*/ ctx[6]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*tip*/ 1) set_data(t, /*tip*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$6(ctx) {
    	let div1;
    	let span;
    	let t;
    	let div0;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);
    	const if_block_creators = [create_if_block$3, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*tip*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			div1 = element("div");
    			span = element("span");
    			if (default_slot) default_slot.c();
    			t = space();
    			div0 = element("div");
    			if_block.c();
    			attr(span, "class", "tooltip-slot svelte-16glvw6");
    			attr(div0, "class", "tooltip svelte-16glvw6");
    			toggle_class(div0, "active", /*active*/ ctx[5]);
    			toggle_class(div0, "left", /*left*/ ctx[4]);
    			toggle_class(div0, "right", /*right*/ ctx[2]);
    			toggle_class(div0, "bottom", /*bottom*/ ctx[3]);
    			toggle_class(div0, "top", /*top*/ ctx[1]);
    			attr(div1, "class", "tooltip-wrapper svelte-16glvw6");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, span);

    			if (default_slot) {
    				default_slot.m(span, null);
    			}

    			append(div1, t);
    			append(div1, div0);
    			if_blocks[current_block_type_index].m(div0, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 256)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[8],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[8])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[8], dirty, null),
    						null
    					);
    				}
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(div0, null);
    			}

    			if (!current || dirty & /*active*/ 32) {
    				toggle_class(div0, "active", /*active*/ ctx[5]);
    			}

    			if (!current || dirty & /*left*/ 16) {
    				toggle_class(div0, "left", /*left*/ ctx[4]);
    			}

    			if (!current || dirty & /*right*/ 4) {
    				toggle_class(div0, "right", /*right*/ ctx[2]);
    			}

    			if (!current || dirty & /*bottom*/ 8) {
    				toggle_class(div0, "bottom", /*bottom*/ ctx[3]);
    			}

    			if (!current || dirty & /*top*/ 2) {
    				toggle_class(div0, "top", /*top*/ ctx[1]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			if (default_slot) default_slot.d(detaching);
    			if_blocks[current_block_type_index].d();
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { tip = "" } = $$props;
    	let { top = false } = $$props;
    	let { right = false } = $$props;
    	let { bottom = false } = $$props;
    	let { left = false } = $$props;
    	let { active = false } = $$props;
    	let { color = "#757575" } = $$props;
    	let style = `background-color: ${color};`;

    	$$self.$$set = $$props => {
    		if ('tip' in $$props) $$invalidate(0, tip = $$props.tip);
    		if ('top' in $$props) $$invalidate(1, top = $$props.top);
    		if ('right' in $$props) $$invalidate(2, right = $$props.right);
    		if ('bottom' in $$props) $$invalidate(3, bottom = $$props.bottom);
    		if ('left' in $$props) $$invalidate(4, left = $$props.left);
    		if ('active' in $$props) $$invalidate(5, active = $$props.active);
    		if ('color' in $$props) $$invalidate(7, color = $$props.color);
    		if ('$$scope' in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    	};

    	return [tip, top, right, bottom, left, active, style, color, $$scope, slots];
    }

    class SvelteTooltip extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$6,
    			create_fragment$6,
    			safe_not_equal,
    			{
    				tip: 0,
    				top: 1,
    				right: 2,
    				bottom: 3,
    				left: 4,
    				active: 5,
    				color: 7
    			},
    			add_css$4
    		);
    	}
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
    function apiPost(path, data, uid) {
        var _this = this;
        if (uid === void 0) { uid = null; }
        return new Promise(function (resolve, reject) {
            wp.apiRequest({
                path: path,
                data: data,
                type: "POST",
                headers: {
                    "x-wssb-uid": uid
                }
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

    function htmlDecode(input) {
        var doc = new DOMParser().parseFromString(input, "text/html");
        return doc.documentElement.textContent;
    }

    const map_posts = (post) => {
        return {
            id: post.id || post.ID || post.slot?.post_id || `slot-${post.slot?.id}`,
            title: post.post_title,
            author: post.post_author,
            date_published: post.post_date,
            edit_link: htmlDecode(post.edit_post_link),
            link: htmlDecode(post.post_link),
            type: post.post_type,
            image: post.image,
            order: post.menu_order,
            slot: post.slot,
            locked: !!(post.slot?.lock_until),
            locked_until: (post.slot?.lock_until) ? new Date(post.slot?.lock_until) : null,
            manual: !!(Number(post.slot?.manual_order)),
            analytics: post.analytics || {},
            is_blank: !(post.id),
            sections: post.post_sections || [],
            edit_lock_until: false,
            proposed_order: 1,
        }
    };

    /* src/components/FrontpageTable.svelte generated by Svelte v3.52.0 */

    function add_css$3(target) {
    	append_styles(target, "svelte-hmlxrt", "table.svelte-hmlxrt{border-collapse:collapse}table.is-updating.svelte-hmlxrt{opacity:0.5;pointer-events:none}tr.is-active.svelte-hmlxrt{background-color:rgb(204, 204, 204) !important}tr.is-locked.svelte-hmlxrt{background-color:rgb(250, 232, 238) !important}.column-header-image.svelte-hmlxrt{width:50px}.column-header-title.svelte-hmlxrt{width:30%}.width-30.svelte-hmlxrt{width:30px}.cursor-pointer.svelte-hmlxrt{cursor:pointer}");
    }

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[22] = list[i];
    	child_ctx[23] = list;
    	child_ctx[24] = i;
    	return child_ctx;
    }

    // (188:12) {#if (mode === "development")}
    function create_if_block_4(ctx) {
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

    // (216:16) {#if (!post.locked && !!post.slot.post_id)}
    function create_if_block_3(ctx) {
    	let label;
    	let t1;
    	let input;
    	let mounted;
    	let dispose;

    	function input_change_handler() {
    		/*input_change_handler*/ ctx[11].call(input, /*each_value*/ ctx[23], /*index*/ ctx[24]);
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
    			input.checked = /*post*/ ctx[22].checked;

    			if (!mounted) {
    				dispose = listen(input, "change", input_change_handler);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*$featuredPosts*/ 8) {
    				input.checked = /*post*/ ctx[22].checked;
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

    // (229:16) {#if (!!post.slot.post_id)}
    function create_if_block$2(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1$1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*post*/ ctx[22].locked) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
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
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (238:20) {:else}
    function create_else_block(ctx) {
    	let sveltetooltip;
    	let t;
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;

    	sveltetooltip = new SvelteTooltip({
    			props: {
    				tip: "Click to lock this post in this slot.",
    				left: true,
    				color: "#FFB74D",
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			}
    		});

    	const if_block_creators = [create_if_block_2, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*post*/ ctx[22].manual) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_1(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			create_component(sveltetooltip.$$.fragment);
    			t = space();
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			mount_component(sveltetooltip, target, anchor);
    			insert(target, t, anchor);
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const sveltetooltip_changes = {};

    			if (dirty & /*$$scope, $featuredPosts*/ 33554440) {
    				sveltetooltip_changes.$$scope = { dirty, ctx };
    			}

    			sveltetooltip.$set(sveltetooltip_changes);
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(sveltetooltip.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(sveltetooltip.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(sveltetooltip, detaching);
    			if (detaching) detach(t);
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (230:20) {#if (post.locked)}
    function create_if_block_1$1(ctx) {
    	let div;
    	let sveltetooltip;
    	let t;
    	let dateinput;
    	let updating_value;
    	let current;

    	sveltetooltip = new SvelteTooltip({
    			props: {
    				tip: "This post is locked to this slot. Locked by " + /*post*/ ctx[22].slot.locked_by + " on " + /*post*/ ctx[22].slot.locked_at + ".",
    				left: true,
    				color: "#FFB74D",
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			}
    		});

    	function dateinput_value_binding(value) {
    		/*dateinput_value_binding*/ ctx[12](value, /*post*/ ctx[22]);
    	}

    	let dateinput_props = { closeOnSelection: true };

    	if (/*post*/ ctx[22].locked_until !== void 0) {
    		dateinput_props.value = /*post*/ ctx[22].locked_until;
    	}

    	dateinput = new DateInput({ props: dateinput_props });
    	binding_callbacks.push(() => bind(dateinput, 'value', dateinput_value_binding));

    	dateinput.$on("update", function () {
    		if (is_function(/*doLock*/ ctx[6](/*post*/ ctx[22], /*post*/ ctx[22].locked_until))) /*doLock*/ ctx[6](/*post*/ ctx[22], /*post*/ ctx[22].locked_until).apply(this, arguments);
    	});

    	return {
    		c() {
    			div = element("div");
    			create_component(sveltetooltip.$$.fragment);
    			t = space();
    			create_component(dateinput.$$.fragment);
    			attr(div, "class", "locked-slot");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(sveltetooltip, div, null);
    			append(div, t);
    			mount_component(dateinput, div, null);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const sveltetooltip_changes = {};
    			if (dirty & /*$featuredPosts*/ 8) sveltetooltip_changes.tip = "This post is locked to this slot. Locked by " + /*post*/ ctx[22].slot.locked_by + " on " + /*post*/ ctx[22].slot.locked_at + ".";

    			if (dirty & /*$$scope, $featuredPosts*/ 33554440) {
    				sveltetooltip_changes.$$scope = { dirty, ctx };
    			}

    			sveltetooltip.$set(sveltetooltip_changes);
    			const dateinput_changes = {};

    			if (!updating_value && dirty & /*$featuredPosts*/ 8) {
    				updating_value = true;
    				dateinput_changes.value = /*post*/ ctx[22].locked_until;
    				add_flush_callback(() => updating_value = false);
    			}

    			dateinput.$set(dateinput_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(sveltetooltip.$$.fragment, local);
    			transition_in(dateinput.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(sveltetooltip.$$.fragment, local);
    			transition_out(dateinput.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(sveltetooltip);
    			destroy_component(dateinput);
    		}
    	};
    }

    // (239:24) <SvelteTooltip tip="Click to lock this post in this slot." left color="#FFB74D">
    function create_default_slot_3(ctx) {
    	let span;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			span = element("span");
    			attr(span, "class", "dashicons dashicons-unlock cursor-pointer svelte-hmlxrt");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);

    			if (!mounted) {
    				dispose = listen(span, "click", function () {
    					if (is_function(/*doLock*/ ctx[6](/*post*/ ctx[22]))) /*doLock*/ ctx[6](/*post*/ ctx[22]).apply(this, arguments);
    				});

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (248:24) {:else}
    function create_else_block_1(ctx) {
    	let sveltetooltip;
    	let current;

    	sveltetooltip = new SvelteTooltip({
    			props: {
    				tip: "This slot is automatically ordered.",
    				left: true,
    				color: "#FFB74D",
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(sveltetooltip.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(sveltetooltip, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const sveltetooltip_changes = {};

    			if (dirty & /*$$scope, $featuredPosts*/ 33554440) {
    				sveltetooltip_changes.$$scope = { dirty, ctx };
    			}

    			sveltetooltip.$set(sveltetooltip_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(sveltetooltip.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(sveltetooltip.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(sveltetooltip, detaching);
    		}
    	};
    }

    // (243:24) {#if (post.manual)}
    function create_if_block_2(ctx) {
    	let sveltetooltip;
    	let current;

    	sveltetooltip = new SvelteTooltip({
    			props: {
    				tip: "This slot is manually ordered.",
    				left: true,
    				color: "#FFB74D",
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(sveltetooltip.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(sveltetooltip, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const sveltetooltip_changes = {};

    			if (dirty & /*$$scope, $featuredPosts*/ 33554440) {
    				sveltetooltip_changes.$$scope = { dirty, ctx };
    			}

    			sveltetooltip.$set(sveltetooltip_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(sveltetooltip.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(sveltetooltip.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(sveltetooltip, detaching);
    		}
    	};
    }

    // (249:28) <SvelteTooltip tip="This slot is automatically ordered." left color="#FFB74D">
    function create_default_slot_2(ctx) {
    	let span;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			span = element("span");
    			attr(span, "class", "dashicons dashicons-chart-pie cursor-pointer svelte-hmlxrt");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);

    			if (!mounted) {
    				dispose = listen(span, "click", function () {
    					if (is_function(/*doManual*/ ctx[7](/*post*/ ctx[22].slot))) /*doManual*/ ctx[7](/*post*/ ctx[22].slot).apply(this, arguments);
    				});

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (244:28) <SvelteTooltip tip="This slot is manually ordered." left color="#FFB74D">
    function create_default_slot_1$1(ctx) {
    	let span;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			span = element("span");
    			attr(span, "class", "dashicons dashicons-businessperson cursor-pointer svelte-hmlxrt");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);

    			if (!mounted) {
    				dispose = listen(span, "click", function () {
    					if (is_function(/*doAuto*/ ctx[8](/*post*/ ctx[22].slot))) /*doAuto*/ ctx[8](/*post*/ ctx[22].slot).apply(this, arguments);
    				});

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (232:28) <SvelteTooltip tip="This post is locked to this slot. Locked by {post.slot.locked_by} on {post.slot.locked_at}." left color="#FFB74D">
    function create_default_slot$1(ctx) {
    	let span;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			span = element("span");
    			attr(span, "class", "dashicons dashicons-lock cursor-pointer svelte-hmlxrt");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);

    			if (!mounted) {
    				dispose = listen(span, "click", function () {
    					if (is_function(/*doUnlock*/ ctx[9](/*post*/ ctx[22]))) /*doUnlock*/ ctx[9](/*post*/ ctx[22]).apply(this, arguments);
    				});

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (202:8) {#each $featuredPosts as post, index (post.id)}
    function create_each_block$2(key_1, ctx) {
    	let tr;
    	let th0;
    	let t0_value = /*index*/ ctx[24] + 1 + "";
    	let t0;
    	let t1;
    	let th1;
    	let t2;
    	let postrow;
    	let t3;
    	let th2;
    	let t4;
    	let tr_id_value;
    	let tr_data_post_id_value;
    	let tr_data_index_value;
    	let tr_data_slot_id_value;
    	let rect;
    	let stop_animation = noop;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = !/*post*/ ctx[22].locked && !!/*post*/ ctx[22].slot.post_id && create_if_block_3(ctx);

    	postrow = new PostRow({
    			props: {
    				post: /*post*/ ctx[22],
    				index: /*index*/ ctx[24],
    				hovering: /*rowHovering*/ ctx[4] === /*index*/ ctx[24],
    				total_hits: /*total_hits*/ ctx[1],
    				analytics: /*analytics*/ ctx[2]
    			}
    		});

    	let if_block1 = !!/*post*/ ctx[22].slot.post_id && create_if_block$2(ctx);

    	function mouseover_handler() {
    		return /*mouseover_handler*/ ctx[13](/*index*/ ctx[24]);
    	}

    	function focus_handler() {
    		return /*focus_handler*/ ctx[14](/*index*/ ctx[24]);
    	}

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			tr = element("tr");
    			th0 = element("th");
    			t0 = text(t0_value);
    			t1 = space();
    			th1 = element("th");
    			if (if_block0) if_block0.c();
    			t2 = space();
    			create_component(postrow.$$.fragment);
    			t3 = space();
    			th2 = element("th");
    			if (if_block1) if_block1.c();
    			t4 = space();
    			attr(th0, "class", "width-30 svelte-hmlxrt");
    			attr(th1, "scope", "row");
    			attr(th1, "class", "check-column");
    			attr(th2, "scope", "row");
    			attr(th2, "class", "lock-column");
    			attr(tr, "id", tr_id_value = "post-" + /*post*/ ctx[22].id);
    			attr(tr, "data-post_id", tr_data_post_id_value = /*post*/ ctx[22].id);
    			attr(tr, "data-index", tr_data_index_value = /*index*/ ctx[24]);
    			attr(tr, "data-slot_id", tr_data_slot_id_value = /*post*/ ctx[22].slot.id);
    			attr(tr, "class", "svelte-hmlxrt");
    			toggle_class(tr, "is-active", hovering === /*index*/ ctx[24]);
    			toggle_class(tr, "is-locked", /*post*/ ctx[22].locked);
    			this.first = tr;
    		},
    		m(target, anchor) {
    			insert(target, tr, anchor);
    			append(tr, th0);
    			append(th0, t0);
    			append(tr, t1);
    			append(tr, th1);
    			if (if_block0) if_block0.m(th1, null);
    			append(tr, t2);
    			mount_component(postrow, tr, null);
    			append(tr, t3);
    			append(tr, th2);
    			if (if_block1) if_block1.m(th2, null);
    			append(tr, t4);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(tr, "mouseover", mouseover_handler),
    					listen(tr, "focus", focus_handler)
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if ((!current || dirty & /*$featuredPosts*/ 8) && t0_value !== (t0_value = /*index*/ ctx[24] + 1 + "")) set_data(t0, t0_value);

    			if (!/*post*/ ctx[22].locked && !!/*post*/ ctx[22].slot.post_id) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					if_block0.m(th1, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			const postrow_changes = {};
    			if (dirty & /*$featuredPosts*/ 8) postrow_changes.post = /*post*/ ctx[22];
    			if (dirty & /*$featuredPosts*/ 8) postrow_changes.index = /*index*/ ctx[24];
    			if (dirty & /*rowHovering, $featuredPosts*/ 24) postrow_changes.hovering = /*rowHovering*/ ctx[4] === /*index*/ ctx[24];
    			if (dirty & /*total_hits*/ 2) postrow_changes.total_hits = /*total_hits*/ ctx[1];
    			if (dirty & /*analytics*/ 4) postrow_changes.analytics = /*analytics*/ ctx[2];
    			postrow.$set(postrow_changes);

    			if (!!/*post*/ ctx[22].slot.post_id) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*$featuredPosts*/ 8) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$2(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(th2, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*$featuredPosts*/ 8 && tr_id_value !== (tr_id_value = "post-" + /*post*/ ctx[22].id)) {
    				attr(tr, "id", tr_id_value);
    			}

    			if (!current || dirty & /*$featuredPosts*/ 8 && tr_data_post_id_value !== (tr_data_post_id_value = /*post*/ ctx[22].id)) {
    				attr(tr, "data-post_id", tr_data_post_id_value);
    			}

    			if (!current || dirty & /*$featuredPosts*/ 8 && tr_data_index_value !== (tr_data_index_value = /*index*/ ctx[24])) {
    				attr(tr, "data-index", tr_data_index_value);
    			}

    			if (!current || dirty & /*$featuredPosts*/ 8 && tr_data_slot_id_value !== (tr_data_slot_id_value = /*post*/ ctx[22].slot.id)) {
    				attr(tr, "data-slot_id", tr_data_slot_id_value);
    			}

    			if (!current || dirty & /*hovering, $featuredPosts*/ 8) {
    				toggle_class(tr, "is-active", hovering === /*index*/ ctx[24]);
    			}

    			if (!current || dirty & /*$featuredPosts*/ 8) {
    				toggle_class(tr, "is-locked", /*post*/ ctx[22].locked);
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
    			transition_in(if_block1);
    			current = true;
    		},
    		o(local) {
    			transition_out(postrow.$$.fragment, local);
    			transition_out(if_block1);
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

    function create_fragment$5(ctx) {
    	let table;
    	let thead;
    	let tr;
    	let td0;
    	let t0;
    	let td1;
    	let label;
    	let t2;
    	let input;
    	let t3;
    	let th0;
    	let t5;
    	let t6;
    	let th1;
    	let t8;
    	let th2;
    	let t10;
    	let th3;
    	let t12;
    	let th4;
    	let t14;
    	let th5;
    	let t16;
    	let th6;
    	let t17;
    	let tbody;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let table_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*mode*/ ctx[5] === "development" && create_if_block_4();
    	let each_value = /*$featuredPosts*/ ctx[3];
    	const get_key = ctx => /*post*/ ctx[22].id;

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
    			td0 = element("td");
    			t0 = space();
    			td1 = element("td");
    			label = element("label");
    			label.textContent = "Select All";
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			th0 = element("th");
    			th0.textContent = "Image";
    			t5 = space();
    			if (if_block) if_block.c();
    			t6 = space();
    			th1 = element("th");
    			th1.textContent = "Section";
    			t8 = space();
    			th2 = element("th");
    			th2.textContent = "Title";
    			t10 = space();
    			th3 = element("th");
    			th3.textContent = "Author";
    			t12 = space();
    			th4 = element("th");
    			th4.textContent = "Published";
    			t14 = space();
    			th5 = element("th");
    			th5.textContent = "Hits";
    			t16 = space();
    			th6 = element("th");
    			t17 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(td0, "class", "width-30 svelte-hmlxrt");
    			attr(label, "class", "screen-reader-text");
    			attr(label, "for", "");
    			attr(input, "class", "");
    			attr(input, "type", "checkbox");
    			attr(td1, "class", "manage-column check-column");
    			attr(th0, "scope", "col");
    			attr(th0, "class", "column-header-image svelte-hmlxrt");
    			attr(th1, "scope", "col");
    			attr(th1, "class", "manage-column");
    			attr(th2, "scope", "col");
    			attr(th2, "class", "column-header-title svelte-hmlxrt");
    			attr(th3, "scope", "col");
    			attr(th3, "class", "manage-column");
    			attr(th4, "scope", "col");
    			attr(th4, "class", "manage-column");
    			attr(th5, "scope", "col");
    			attr(th5, "class", "manage-column");
    			attr(th6, "scope", "col");
    			attr(th6, "class", "manage-column");
    			attr(table, "class", table_class_value = "wp-list-table widefat fixed striped table-view-list featuredposts " + (/*updating*/ ctx[0] ? "is-updating" : "") + " svelte-hmlxrt");
    		},
    		m(target, anchor) {
    			insert(target, table, anchor);
    			append(table, thead);
    			append(thead, tr);
    			append(tr, td0);
    			append(tr, t0);
    			append(tr, td1);
    			append(td1, label);
    			append(td1, t2);
    			append(td1, input);
    			append(tr, t3);
    			append(tr, th0);
    			append(tr, t5);
    			if (if_block) if_block.m(tr, null);
    			append(tr, t6);
    			append(tr, th1);
    			append(tr, t8);
    			append(tr, th2);
    			append(tr, t10);
    			append(tr, th3);
    			append(tr, t12);
    			append(tr, th4);
    			append(tr, t14);
    			append(tr, th5);
    			append(tr, t16);
    			append(tr, th6);
    			append(table, t17);
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
    			if (dirty & /*$featuredPosts, hovering, rowHovering, doLock, doUnlock, doAuto, doManual, total_hits, analytics*/ 990) {
    				each_value = /*$featuredPosts*/ ctx[3];
    				group_outros();
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, tbody, fix_and_outro_and_destroy_block, create_each_block$2, null, get_each_context$2);
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].a();
    				check_outros();
    			}

    			if (!current || dirty & /*updating*/ 1 && table_class_value !== (table_class_value = "wp-list-table widefat fixed striped table-view-list featuredposts " + (/*updating*/ ctx[0] ? "is-updating" : "") + " svelte-hmlxrt")) {
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

    let hovering = false;

    function instance$5($$self, $$props, $$invalidate) {
    	let $featuredPosts;
    	let $frontpageId;
    	let $unique_id;
    	component_subscribe($$self, featuredPosts, $$value => $$invalidate(3, $featuredPosts = $$value));
    	component_subscribe($$self, frontpageId, $$value => $$invalidate(15, $frontpageId = $$value));
    	component_subscribe($$self, unique_id, $$value => $$invalidate(16, $unique_id = $$value));
    	const mode = "production";
    	const dispatch = createEventDispatcher();
    	let rowHovering = false;
    	let { updating = false } = $$props;
    	let { total_hits = 0 } = $$props;
    	let { analytics = [] } = $$props;

    	const doMove = async (post_id, slot_id) => {
    		$$invalidate(0, updating = true);

    		try {
    			set_store_value(featuredPosts, $featuredPosts = (await apiPost(`frontpageengine/v1/move_post/${$frontpageId}?${mode == "development" ? "simulate_analytics=1" : ""}`, { post_id, slot_id }, $unique_id)).posts.map(map_posts), $featuredPosts);
    			dispatch("updated");
    		} catch(e) {
    		} finally {
    			$$invalidate(0, updating = false);
    		}
    	};

    	const doLock = async (post, date) => {
    		$$invalidate(0, updating = true);

    		try {
    			let lock_until = new Date().getTime() + 1000 * 60 * 60 * 24;

    			if (date) {
    				lock_until = new Date(date).getTime();
    			}

    			set_store_value(
    				featuredPosts,
    				$featuredPosts = (await apiPost(`frontpageengine/v1/lock_post/${$frontpageId}?${mode == "development" ? "simulate_analytics=1" : ""}`, {
    					lock_until: formatTimeSql(new Date(lock_until)),
    					post_id: post.slot.post_id
    				})).posts.map(map_posts),
    				$featuredPosts
    			);

    			dispatch("updated");
    		} catch(e) {
    		} finally {
    			$$invalidate(0, updating = false);
    		}
    	};

    	const doManual = async slot => {
    		$$invalidate(0, updating = true);

    		try {
    			set_store_value(featuredPosts, $featuredPosts = (await apiGet(`frontpageengine/v1/slot/manual/${$frontpageId}/${slot.id}`)).posts.map(map_posts), $featuredPosts);
    			dispatch("updated");
    		} catch(e) {
    		} finally {
    			$$invalidate(0, updating = false);
    		}
    	};

    	const doAuto = async slot => {
    		$$invalidate(0, updating = true);

    		try {
    			set_store_value(featuredPosts, $featuredPosts = (await apiGet(`frontpageengine/v1/slot/auto/${$frontpageId}/${slot.id}`)).posts.map(map_posts), $featuredPosts);
    			dispatch("updated");
    		} catch(e) {
    		} finally {
    			$$invalidate(0, updating = false);
    		}
    	};

    	const doUnlock = async post => {
    		$$invalidate(0, updating = true);

    		try {
    			set_store_value(featuredPosts, $featuredPosts = (await apiPost(`frontpageengine/v1/unlock_post/${$frontpageId}?${mode == "development" ? "simulate_analytics=1" : ""}`, { post_id: post.slot.post_id })).posts.map(map_posts), $featuredPosts);
    			dispatch("updated");
    		} catch(e) {
    		} finally {
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

    	const setupSortable = () => {

    		if (jQuery("table.featuredposts").hasClass("ui-sortable")) {
    			jQuery("table.featuredposts").sortable("destroy");
    		}

    		jQuery("table.featuredposts").sortable({
    			items: "tr:not(.is-locked)",
    			cursor: "move",
    			opacity: 0.6,
    			containment: "parent",
    			axis: "y",
    			start: (e, ui) => {
    				// Disable item while moving
    				ui.item.prop("disabled", true);
    			},
    			update: (e, ui) => {
    				if (ui.item.hasClass("is-locked")) {
    					jQuery("table.featuredposts").sortable("cancel");
    					return;
    				}

    				const post_id = ui.item.data("post_id");
    				const target_index = ui.item.index();
    				const start_index = ui.item.data("index");
    				const slot_id = $featuredPosts[target_index].slot.id;

    				if (start_index !== target_index) {
    					doMove(post_id, slot_id);
    				}
    			}
    		});
    	};

    	onMount(() => {
    		setupSortable();
    	});

    	afterUpdate(() => {
    		
    	}); // setupSortable();
    	// jQuery("table.featuredposts").sortable("refresh");

    	function input_change_handler(each_value, index) {
    		each_value[index].checked = this.checked;
    		featuredPosts.set($featuredPosts);
    	}

    	function dateinput_value_binding(value, post) {
    		if ($$self.$$.not_equal(post.locked_until, value)) {
    			post.locked_until = value;
    			featuredPosts.set($featuredPosts);
    		}
    	}

    	const mouseover_handler = index => $$invalidate(4, rowHovering = index);
    	const focus_handler = index => $$invalidate(4, rowHovering = index);

    	$$self.$$set = $$props => {
    		if ('updating' in $$props) $$invalidate(0, updating = $$props.updating);
    		if ('total_hits' in $$props) $$invalidate(1, total_hits = $$props.total_hits);
    		if ('analytics' in $$props) $$invalidate(2, analytics = $$props.analytics);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$featuredPosts*/ 8) {
    			{
    				$featuredPosts.forEach(post => {
    					if (post.locked_until) {
    						post.slot.lock_until = formatTime(post.locked_until);
    					}
    				});
    			} // console.log("featuredPosts changed");
    			// jQuery("table.featuredposts").sortable("destroy");
    		}
    	};

    	return [
    		updating,
    		total_hits,
    		analytics,
    		$featuredPosts,
    		rowHovering,
    		mode,
    		doLock,
    		doManual,
    		doAuto,
    		doUnlock,
    		checkAll,
    		input_change_handler,
    		dateinput_value_binding,
    		mouseover_handler,
    		focus_handler
    	];
    }

    class FrontpageTable extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { updating: 0, total_hits: 1, analytics: 2 }, add_css$3);
    	}
    }

    /* src/components/Search.svelte generated by Svelte v3.52.0 */

    function create_fragment$4(ctx) {
    	let input;
    	let t0;
    	let button0;
    	let t2;
    	let button1;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			input = element("input");
    			t0 = space();
    			button0 = element("button");
    			button0.textContent = "Search";
    			t2 = space();
    			button1 = element("button");
    			button1.textContent = "Clear";
    			attr(input, "type", "text");
    			attr(input, "placeholder", "Search");
    		},
    		m(target, anchor) {
    			insert(target, input, anchor);
    			set_input_value(input, /*value*/ ctx[0]);
    			insert(target, t0, anchor);
    			insert(target, button0, anchor);
    			insert(target, t2, anchor);
    			insert(target, button1, anchor);

    			if (!mounted) {
    				dispose = [
    					listen(input, "input", /*input_input_handler*/ ctx[3]),
    					listen(input, "keydown", /*keydown_handler*/ ctx[4]),
    					listen(button0, "click", /*doSearch*/ ctx[1]),
    					listen(button0, "keypress", /*keypress_handler*/ ctx[5]),
    					listen(button1, "click", /*doClear*/ ctx[2]),
    					listen(button1, "keypress", /*keypress_handler_1*/ ctx[6])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*value*/ 1 && input.value !== /*value*/ ctx[0]) {
    				set_input_value(input, /*value*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(input);
    			if (detaching) detach(t0);
    			if (detaching) detach(button0);
    			if (detaching) detach(t2);
    			if (detaching) detach(button1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { value = "" } = $$props;
    	let previous_value = "";

    	const doSearch = () => {
    		if (value === previous_value) return;
    		dispatch("search", value);
    		previous_value = value;
    	};

    	const doClear = () => {
    		$$invalidate(0, value = "");
    		if (previous_value == "") return;
    		previous_value = "";
    		dispatch("search", value);
    	};

    	function input_input_handler() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	const keydown_handler = e => e.key == "Enter" && doSearch();
    	const keypress_handler = e => e.key === "Enter" && doSearch;
    	const keypress_handler_1 = e => e.key === "Enter" && doClear;

    	$$self.$$set = $$props => {
    		if ('value' in $$props) $$invalidate(0, value = $$props.value);
    	};

    	return [
    		value,
    		doSearch,
    		doClear,
    		input_input_handler,
    		keydown_handler,
    		keypress_handler,
    		keypress_handler_1
    	];
    }

    class Search extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { value: 0 });
    	}
    }

    /* src/components/AddPostTable.svelte generated by Svelte v3.52.0 */

    function add_css$2(target) {
    	append_styles(target, "svelte-ue8gsb", ".frontpageengine-addpost-topbar.svelte-ue8gsb{display:flex;justify-content:space-between;align-items:center;position:sticky;top:0px;left:0px;padding:10px;background-color:white;z-index:100;box-shadow:0px 0px 10px rgba(0,0,0,0.1)}table.is-updating.svelte-ue8gsb{opacity:0.5;pointer-events:none}.column-header-image.svelte-ue8gsb{width:50px}.column-header-title.svelte-ue8gsb{width:500px}.button.svelte-ue8gsb{margin-bottom:5px}.insert-cell.svelte-ue8gsb{display:flex;flex-direction:column;align-items:center;justify-content:center}.input-position.svelte-ue8gsb{width:50px;margin:5px 0px;text-align:center}");
    }

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[24] = list[i];
    	child_ctx[25] = list;
    	child_ctx[26] = i;
    	return child_ctx;
    }

    // (93:16) {#if (mode === "development")}
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

    // (107:12) {#each posts as post, index (post.id)}
    function create_each_block$1(key_1, ctx) {
    	let tr;
    	let th0;
    	let t2;
    	let postrow;
    	let t3;
    	let th1;
    	let label1;
    	let t5;
    	let input1;
    	let input1_max_value;
    	let t6;
    	let button;
    	let t8;
    	let tr_id_value;
    	let tr_outro;
    	let current;
    	let mounted;
    	let dispose;

    	postrow = new PostRow({
    			props: {
    				post: /*post*/ ctx[24],
    				index: /*index*/ ctx[26],
    				total_hits: /*total_hits*/ ctx[1],
    				analytics: /*analytics*/ ctx[3],
    				hovering: /*rowHovering*/ ctx[5] === /*index*/ ctx[26]
    			}
    		});

    	function input1_input_handler() {
    		/*input1_input_handler*/ ctx[13].call(input1, /*each_value*/ ctx[25], /*index*/ ctx[26]);
    	}

    	function keypress_handler(...args) {
    		return /*keypress_handler*/ ctx[14](/*post*/ ctx[24], ...args);
    	}

    	function click_handler() {
    		return /*click_handler*/ ctx[15](/*post*/ ctx[24]);
    	}

    	function keypress_handler_1(...args) {
    		return /*keypress_handler_1*/ ctx[16](/*post*/ ctx[24], ...args);
    	}

    	function mouseover_handler() {
    		return /*mouseover_handler*/ ctx[17](/*index*/ ctx[26]);
    	}

    	function focus_handler() {
    		return /*focus_handler*/ ctx[18](/*index*/ ctx[26]);
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
    			label1 = element("label");
    			label1.textContent = "Position";
    			t5 = space();
    			input1 = element("input");
    			t6 = space();
    			button = element("button");
    			button.textContent = "Insert";
    			t8 = space();
    			attr(th0, "scope", "row");
    			attr(th0, "class", "check-column");
    			attr(label1, "for", "insert-position");
    			attr(input1, "class", "input-position svelte-ue8gsb");
    			attr(input1, "name", "insert-position");
    			attr(input1, "type", "number");
    			attr(input1, "min", "1");
    			attr(input1, "max", input1_max_value = /*$featuredPosts*/ ctx[6].length);
    			attr(button, "class", "button svelte-ue8gsb");
    			attr(th1, "class", "insert-cell svelte-ue8gsb");
    			attr(tr, "id", tr_id_value = "post-" + /*post*/ ctx[24].id);
    			this.first = tr;
    		},
    		m(target, anchor) {
    			insert(target, tr, anchor);
    			append(tr, th0);
    			append(tr, t2);
    			mount_component(postrow, tr, null);
    			append(tr, t3);
    			append(tr, th1);
    			append(th1, label1);
    			append(th1, t5);
    			append(th1, input1);
    			set_input_value(input1, /*post*/ ctx[24].proposed_order);
    			append(th1, t6);
    			append(th1, button);
    			append(tr, t8);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(input1, "input", input1_input_handler),
    					listen(input1, "keypress", keypress_handler),
    					listen(button, "click", click_handler),
    					listen(button, "keypress", keypress_handler_1),
    					listen(tr, "mouseover", mouseover_handler),
    					listen(tr, "focus", focus_handler)
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const postrow_changes = {};
    			if (dirty & /*posts*/ 4) postrow_changes.post = /*post*/ ctx[24];
    			if (dirty & /*posts*/ 4) postrow_changes.index = /*index*/ ctx[26];
    			if (dirty & /*total_hits*/ 2) postrow_changes.total_hits = /*total_hits*/ ctx[1];
    			if (dirty & /*analytics*/ 8) postrow_changes.analytics = /*analytics*/ ctx[3];
    			if (dirty & /*rowHovering, posts*/ 36) postrow_changes.hovering = /*rowHovering*/ ctx[5] === /*index*/ ctx[26];
    			postrow.$set(postrow_changes);

    			if (!current || dirty & /*$featuredPosts*/ 64 && input1_max_value !== (input1_max_value = /*$featuredPosts*/ ctx[6].length)) {
    				attr(input1, "max", input1_max_value);
    			}

    			if (dirty & /*posts*/ 4 && to_number(input1.value) !== /*post*/ ctx[24].proposed_order) {
    				set_input_value(input1, /*post*/ ctx[24].proposed_order);
    			}

    			if (!current || dirty & /*posts*/ 4 && tr_id_value !== (tr_id_value = "post-" + /*post*/ ctx[24].id)) {
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
    	let div3;
    	let div2;
    	let div0;
    	let search_1;
    	let updating_value;
    	let t0;
    	let div1;
    	let button;
    	let t2;
    	let table;
    	let thead;
    	let tr;
    	let td;
    	let t5;
    	let th0;
    	let t7;
    	let t8;
    	let th1;
    	let t10;
    	let th2;
    	let t12;
    	let th3;
    	let t14;
    	let th4;
    	let t16;
    	let th5;
    	let t17;
    	let th6;
    	let t19;
    	let tbody;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let table_class_value;
    	let current;
    	let mounted;
    	let dispose;

    	function search_1_value_binding(value) {
    		/*search_1_value_binding*/ ctx[12](value);
    	}

    	let search_1_props = {};

    	if (/*search*/ ctx[4] !== void 0) {
    		search_1_props.value = /*search*/ ctx[4];
    	}

    	search_1 = new Search({ props: search_1_props });
    	binding_callbacks.push(() => bind(search_1, 'value', search_1_value_binding));
    	search_1.$on("search", /*getPosts*/ ctx[10]);
    	let if_block = /*mode*/ ctx[7] === "development" && create_if_block$1();
    	let each_value = /*posts*/ ctx[2];
    	const get_key = ctx => /*post*/ ctx[24].id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	return {
    		c() {
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			create_component(search_1.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			button = element("button");
    			button.textContent = "Close";
    			t2 = space();
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");
    			td = element("td");

    			td.innerHTML = `<label class="screen-reader-text" for="cb-select-all-1">Select All</label> 
                    <input class="cb-select-all-1" type="checkbox"/>`;

    			t5 = space();
    			th0 = element("th");
    			th0.textContent = "Image";
    			t7 = space();
    			if (if_block) if_block.c();
    			t8 = space();
    			th1 = element("th");
    			th1.textContent = "Section";
    			t10 = space();
    			th2 = element("th");
    			th2.textContent = "Title";
    			t12 = space();
    			th3 = element("th");
    			th3.textContent = "Author";
    			t14 = space();
    			th4 = element("th");
    			th4.textContent = "Published";
    			t16 = space();
    			th5 = element("th");
    			t17 = space();
    			th6 = element("th");
    			th6.textContent = "Insert";
    			t19 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div0, "class", "frontpageengine-addpost-search svelte-ue8gsb");
    			attr(div1, "class", "close-button");
    			attr(div2, "class", "frontpageengine-addpost-topbar svelte-ue8gsb");
    			attr(td, "class", "manage-column check-column");
    			attr(th0, "scope", "col");
    			attr(th0, "class", "column-header-image svelte-ue8gsb");
    			attr(th1, "scope", "col");
    			attr(th1, "class", "column-section");
    			attr(th2, "scope", "col");
    			attr(th2, "class", "column-header-title svelte-ue8gsb");
    			attr(th3, "scope", "col");
    			attr(th3, "class", "manage-column");
    			attr(th4, "scope", "col");
    			attr(th4, "class", "manage-column");
    			attr(table, "class", table_class_value = "wp-list-table widefat fixed striped table-view-list featuredposts " + (/*updating*/ ctx[0] ? "is-updating" : "") + " svelte-ue8gsb");
    			attr(div3, "class", "frontpageengine-addpost-container");
    		},
    		m(target, anchor) {
    			insert(target, div3, anchor);
    			append(div3, div2);
    			append(div2, div0);
    			mount_component(search_1, div0, null);
    			append(div2, t0);
    			append(div2, div1);
    			append(div1, button);
    			append(div3, t2);
    			append(div3, table);
    			append(table, thead);
    			append(thead, tr);
    			append(tr, td);
    			append(tr, t5);
    			append(tr, th0);
    			append(tr, t7);
    			if (if_block) if_block.m(tr, null);
    			append(tr, t8);
    			append(tr, th1);
    			append(tr, t10);
    			append(tr, th2);
    			append(tr, t12);
    			append(tr, th3);
    			append(tr, t14);
    			append(tr, th4);
    			append(tr, t16);
    			append(tr, th5);
    			append(tr, t17);
    			append(tr, th6);
    			append(table, t19);
    			append(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(button, "click", /*close*/ ctx[8]),
    					listen(button, "keypress", /*close*/ ctx[8])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			const search_1_changes = {};

    			if (!updating_value && dirty & /*search*/ 16) {
    				updating_value = true;
    				search_1_changes.value = /*search*/ ctx[4];
    				add_flush_callback(() => updating_value = false);
    			}

    			search_1.$set(search_1_changes);

    			if (dirty & /*posts, rowHovering, featurePost, $featuredPosts, total_hits, analytics*/ 622) {
    				each_value = /*posts*/ ctx[2];
    				group_outros();
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, tbody, outro_and_destroy_block, create_each_block$1, null, get_each_context$1);
    				check_outros();
    			}

    			if (!current || dirty & /*updating*/ 1 && table_class_value !== (table_class_value = "wp-list-table widefat fixed striped table-view-list featuredposts " + (/*updating*/ ctx[0] ? "is-updating" : "") + " svelte-ue8gsb")) {
    				attr(table, "class", table_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(search_1.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(search_1.$$.fragment, local);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div3);
    			destroy_component(search_1);
    			if (if_block) if_block.d();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    let page = 1;
    let per_page = 100;

    function instance$3($$self, $$props, $$invalidate) {
    	let $unfeaturedPosts;
    	let $featuredPosts;
    	let $show_modal;
    	component_subscribe($$self, unfeaturedPosts, $$value => $$invalidate(19, $unfeaturedPosts = $$value));
    	component_subscribe($$self, featuredPosts, $$value => $$invalidate(6, $featuredPosts = $$value));
    	component_subscribe($$self, show_modal, $$value => $$invalidate(20, $show_modal = $$value));

    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};

    	const mode = "production";
    	const dispatch = createEventDispatcher();
    	let { frontpage_id } = $$props;
    	let { total_hits = 0 } = $$props;
    	let posts = [];
    	let analytics = [];
    	let search = "";
    	let rowHovering = -1;
    	let { updating = false } = $$props;

    	const close = () => {
    		set_store_value(show_modal, $show_modal = false, $show_modal);
    	};

    	const featurePost = (post, position) => __awaiter(void 0, void 0, void 0, function* () {
    		$$invalidate(0, updating = true);

    		try {
    			set_store_value(featuredPosts, $featuredPosts = (yield apiPost(`frontpageengine/v1/add_post/${frontpage_id}?${mode === "development" ? "simulate_analytics=1" : ""}`, { post_id: post.id, position })).posts.map(map_posts), $featuredPosts);
    			$$invalidate(2, posts = posts.filter(p => p.id !== post.id));
    			dispatch("updated");
    		} catch(e) {
    		} finally {
    			$$invalidate(0, updating = false);
    		}
    	});

    	const getPosts = () => __awaiter(void 0, void 0, void 0, function* () {
    		$$invalidate(0, updating = true);

    		try {
    			const result = yield apiGet(`frontpageengine/v1/unfeatured_posts/${frontpage_id}?search=${search}&page=${page}&per_page=${per_page}`);
    			set_store_value(unfeaturedPosts, $unfeaturedPosts = result.posts.map(map_posts), $unfeaturedPosts);
    			$$invalidate(2, posts = $unfeaturedPosts);
    			getAnalytics();
    		} catch(e) {
    		} finally {
    			$$invalidate(0, updating = false);
    		}
    	});

    	const getAnalytics = () => __awaiter(void 0, void 0, void 0, function* () {
    		const post_ids = posts.map(p => p.id);
    		const result = yield apiPost(`frontpageengine/v1/analytics?${""}`, { post_ids });
    		$$invalidate(3, analytics = Object.values(result.analytics));
    	}); // total_hits = analytics.reduce((a, b) => a + b.hits_last_hour, 0);
    	// console.log("totalHits", total_hits);

    	onMount(() => __awaiter(void 0, void 0, void 0, function* () {
    		getPosts();
    	}));

    	function search_1_value_binding(value) {
    		search = value;
    		$$invalidate(4, search);
    	}

    	function input1_input_handler(each_value, index) {
    		each_value[index].proposed_order = to_number(this.value);
    		$$invalidate(2, posts);
    	}

    	const keypress_handler = (post, e) => e.key === "Enter" && featurePost(post, post.proposed_order);
    	const click_handler = post => featurePost(post, post.proposed_order);
    	const keypress_handler_1 = (post, e) => e.key === "Enter" && featurePost(post, post.proposed_order);
    	const mouseover_handler = index => $$invalidate(5, rowHovering = index);
    	const focus_handler = index => $$invalidate(5, rowHovering = index);

    	$$self.$$set = $$props => {
    		if ('frontpage_id' in $$props) $$invalidate(11, frontpage_id = $$props.frontpage_id);
    		if ('total_hits' in $$props) $$invalidate(1, total_hits = $$props.total_hits);
    		if ('updating' in $$props) $$invalidate(0, updating = $$props.updating);
    	};

    	return [
    		updating,
    		total_hits,
    		posts,
    		analytics,
    		search,
    		rowHovering,
    		$featuredPosts,
    		mode,
    		close,
    		featurePost,
    		getPosts,
    		frontpage_id,
    		search_1_value_binding,
    		input1_input_handler,
    		keypress_handler,
    		click_handler,
    		keypress_handler_1,
    		mouseover_handler,
    		focus_handler
    	];
    }

    class AddPostTable extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$3,
    			create_fragment$3,
    			safe_not_equal,
    			{
    				frontpage_id: 11,
    				total_hits: 1,
    				updating: 0
    			},
    			add_css$2
    		);
    	}
    }

    /* src/components/Modal.svelte generated by Svelte v3.52.0 */

    function add_css$1(target) {
    	append_styles(target, "svelte-1tyvbx", ".modal-background.svelte-1tyvbx{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.3);z-index:10000}.modal.svelte-1tyvbx{position:fixed;display:block;left:50%;top:50%;width:calc(100vw - 4em);max-width:90%;max-height:calc(100vh - 6em);overflow:auto;transform:translate(-50%,-50%);border-radius:0.2em;background:white;z-index:10001}.frontpageengine-modal-title.svelte-1tyvbx{padding:1em}.frontpageengine-modal-footer.svelte-1tyvbx{margin-top:1em}");
    }

    const get_footer_slot_changes = dirty => ({});
    const get_footer_slot_context = ctx => ({});
    const get_title_slot_changes = dirty => ({});
    const get_title_slot_context = ctx => ({});

    function create_fragment$2(ctx) {
    	let div0;
    	let t0;
    	let div4;
    	let div1;
    	let h3;
    	let t1;
    	let div2;
    	let t2;
    	let div3;
    	let current;
    	let mounted;
    	let dispose;
    	const title_slot_template = /*#slots*/ ctx[5].title;
    	const title_slot = create_slot(title_slot_template, ctx, /*$$scope*/ ctx[4], get_title_slot_context);
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);
    	const footer_slot_template = /*#slots*/ ctx[5].footer;
    	const footer_slot = create_slot(footer_slot_template, ctx, /*$$scope*/ ctx[4], get_footer_slot_context);

    	return {
    		c() {
    			div0 = element("div");
    			t0 = space();
    			div4 = element("div");
    			div1 = element("div");
    			h3 = element("h3");
    			if (title_slot) title_slot.c();
    			t1 = space();
    			div2 = element("div");
    			if (default_slot) default_slot.c();
    			t2 = space();
    			div3 = element("div");
    			if (footer_slot) footer_slot.c();
    			attr(div0, "class", "modal-background svelte-1tyvbx");
    			attr(div1, "class", "frontpageengine-modal-title svelte-1tyvbx");
    			attr(div2, "class", "frontpageengine-modal-content");
    			attr(div3, "class", "frontpageengine-modal-footer svelte-1tyvbx");
    			attr(div4, "class", "modal svelte-1tyvbx");
    			attr(div4, "role", "dialog");
    			attr(div4, "aria-modal", "true");
    		},
    		m(target, anchor) {
    			insert(target, div0, anchor);
    			/*div0_binding*/ ctx[6](div0);
    			insert(target, t0, anchor);
    			insert(target, div4, anchor);
    			append(div4, div1);
    			append(div1, h3);

    			if (title_slot) {
    				title_slot.m(h3, null);
    			}

    			append(div4, t1);
    			append(div4, div2);

    			if (default_slot) {
    				default_slot.m(div2, null);
    			}

    			append(div4, t2);
    			append(div4, div3);

    			if (footer_slot) {
    				footer_slot.m(div3, null);
    			}

    			/*div4_binding*/ ctx[7](div4);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(window, "keydown", /*handle_keydown*/ ctx[3]),
    					listen(div0, "click", /*close*/ ctx[2]),
    					listen(div0, "keypress", /*handle_keydown*/ ctx[3]),
    					listen(div4, "close", /*close*/ ctx[2])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (title_slot) {
    				if (title_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot_base(
    						title_slot,
    						title_slot_template,
    						ctx,
    						/*$$scope*/ ctx[4],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
    						: get_slot_changes(title_slot_template, /*$$scope*/ ctx[4], dirty, get_title_slot_changes),
    						get_title_slot_context
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

    			if (footer_slot) {
    				if (footer_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot_base(
    						footer_slot,
    						footer_slot_template,
    						ctx,
    						/*$$scope*/ ctx[4],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
    						: get_slot_changes(footer_slot_template, /*$$scope*/ ctx[4], dirty, get_footer_slot_changes),
    						get_footer_slot_context
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(title_slot, local);
    			transition_in(default_slot, local);
    			transition_in(footer_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(title_slot, local);
    			transition_out(default_slot, local);
    			transition_out(footer_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div0);
    			/*div0_binding*/ ctx[6](null);
    			if (detaching) detach(t0);
    			if (detaching) detach(div4);
    			if (title_slot) title_slot.d(detaching);
    			if (default_slot) default_slot.d(detaching);
    			if (footer_slot) footer_slot.d(detaching);
    			/*div4_binding*/ ctx[7](null);
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

    	function div4_binding($$value) {
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
    		div4_binding
    	];
    }

    class Modal extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {}, add_css$1);
    	}
    }

    class FrontPageEngineSocketServer {
        constructor(url, domain = "http://localhost", channel, uid = null) {
            this.url = url;
            if (!this.url) {
                throw new Error("No Websocket URL provided");
            }
            this.domain = domain;
            this.channel = channel;
            this.callbacks = [];
            this.uid = uid;
            this.connect();
        }

        connect() {
            this.socket = new WebSocket(this.url);
            // this.socket.onopen = this.onOpen.bind(this);
            this.socket.onclose = this.onClose.bind(this);
            this.socket.onmessage = this.onMessage.bind(this);
            this.socket.onopen = this.onConnect.bind(this);
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
                this.socket.send(JSON.stringify({ event: "subscribe", channel: this.channel, domain: this.domain, uid: this.uid }));
            } else {
                this.socket.onopen = () => {
                    this.socket.send(JSON.stringify({ event: "subscribe", channel: this.channel, domain: this.domain, uid: this.uid }));
                };
            }
        }

        on(name, callback) {
            this.callbacks.push({ name, callback });
        }

        // onOpen(event) {
        //     console.log(event);
        // }

        onConnect() {
            this.subscribe();
        }

        onMessage(encodedMessage) {
            // console.log({ data: message.data });
            const message = JSON.parse(encodedMessage.data);
            Promise.all(this.callbacks.map(callback => {
                if (callback.name === message.data) {
                    return callback.callback(message);
                }
            }));
        }

        onClose(event) {
            // Reconnect
            this.connect();
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
                message.event = "broadcast";
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
    	append_styles(target, "svelte-4dra5q", ".action-bar.svelte-4dra5q{display:flex;justify-content:left;flex-direction:row}.button.svelte-4dra5q{margin-right:10px}");
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[26] = list[i];
    	return child_ctx;
    }

    // (122:8) <Message type={message.type}>
    function create_default_slot_1(ctx) {
    	let t_value = /*message*/ ctx[26].message + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*messages*/ 2 && t_value !== (t_value = /*message*/ ctx[26].message + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (121:4) {#each messages as message}
    function create_each_block(ctx) {
    	let message;
    	let current;

    	message = new Message({
    			props: {
    				type: /*message*/ ctx[26].type,
    				$$slots: { default: [create_default_slot_1] },
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
    			if (dirty & /*messages*/ 2) message_changes.type = /*message*/ ctx[26].type;

    			if (dirty & /*$$scope, messages*/ 536870914) {
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

    // (127:8) {#if show_group_actions}
    function create_if_block_1(ctx) {
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
    			if (/*group_action*/ ctx[4] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[17].call(select));
    		},
    		m(target, anchor) {
    			insert(target, select, anchor);
    			append(select, option0);
    			append(select, option1);
    			select_option(select, /*group_action*/ ctx[4]);

    			if (!mounted) {
    				dispose = [
    					listen(select, "change", /*select_change_handler*/ ctx[17]),
    					listen(select, "change", /*onGroupAction*/ ctx[10])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*group_action*/ 16) {
    				select_option(select, /*group_action*/ ctx[4]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(select);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (135:4) {#if $show_modal}
    function create_if_block(ctx) {
    	let modal;
    	let current;

    	modal = new Modal({
    			props: {
    				$$slots: {
    					title: [create_title_slot],
    					default: [create_default_slot]
    				},
    				$$scope: { ctx }
    			}
    		});

    	modal.$on("close", /*close_handler*/ ctx[18]);

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

    			if (dirty & /*$$scope, frontpage_id, $totalHits*/ 536870945) {
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

    // (136:4) <Modal on:close="{() => $show_modal = false}">
    function create_default_slot(ctx) {
    	let addposttable;
    	let current;

    	addposttable = new AddPostTable({
    			props: {
    				frontpage_id: /*frontpage_id*/ ctx[0],
    				total_hits: /*$totalHits*/ ctx[5]
    			}
    		});

    	addposttable.$on("updated", /*updated*/ ctx[8]);
    	addposttable.$on("close", (void 0));

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
    			if (dirty & /*$totalHits*/ 32) addposttable_changes.total_hits = /*$totalHits*/ ctx[5];
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

    // (137:8) 
    function create_title_slot(ctx) {
    	let h2;

    	return {
    		c() {
    			h2 = element("h2");
    			h2.textContent = "Add Posts";
    			attr(h2, "slot", "title");
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
    	let a0;
    	let t2;
    	let a1;
    	let t4;
    	let t5;
    	let hr;
    	let t6;
    	let t7;
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

    	let if_block0 = /*show_group_actions*/ ctx[3] && create_if_block_1(ctx);
    	let if_block1 = /*$show_modal*/ ctx[7] && create_if_block(ctx);

    	frontpagetable = new FrontpageTable({
    			props: {
    				frontpage_id: /*frontpage_id*/ ctx[0],
    				total_hits: /*$totalHits*/ ctx[5],
    				updating: /*updating*/ ctx[2],
    				analytics: /*$analytics*/ ctx[6]
    			}
    		});

    	frontpagetable.$on("updated", /*updated*/ ctx[8]);

    	return {
    		c() {
    			main = element("main");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			div = element("div");
    			a0 = element("a");
    			a0.textContent = "Add posts";
    			t2 = space();
    			a1 = element("a");
    			a1.textContent = "Auto sort";
    			t4 = space();
    			if (if_block0) if_block0.c();
    			t5 = space();
    			hr = element("hr");
    			t6 = space();
    			if (if_block1) if_block1.c();
    			t7 = space();
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
    			append(div, a0);
    			append(div, t2);
    			append(div, a1);
    			append(div, t4);
    			if (if_block0) if_block0.m(div, null);
    			append(main, t5);
    			append(main, hr);
    			append(main, t6);
    			if (if_block1) if_block1.m(main, null);
    			append(main, t7);
    			mount_component(frontpagetable, main, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(a0, "click", /*click_handler*/ ctx[15]),
    					listen(a1, "click", /*click_handler_1*/ ctx[16])
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

    			if (/*show_group_actions*/ ctx[3]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(div, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*$show_modal*/ ctx[7]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*$show_modal*/ 128) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(main, t7);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			const frontpagetable_changes = {};
    			if (dirty & /*frontpage_id*/ 1) frontpagetable_changes.frontpage_id = /*frontpage_id*/ ctx[0];
    			if (dirty & /*$totalHits*/ 32) frontpagetable_changes.total_hits = /*$totalHits*/ ctx[5];
    			if (dirty & /*updating*/ 4) frontpagetable_changes.updating = /*updating*/ ctx[2];
    			if (dirty & /*$analytics*/ 64) frontpagetable_changes.analytics = /*$analytics*/ ctx[6];
    			frontpagetable.$set(frontpagetable_changes);
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(if_block1);
    			transition_in(frontpagetable.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(if_block1);
    			transition_out(frontpagetable.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(main);
    			destroy_each(each_blocks, detaching);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			destroy_component(frontpagetable);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let $featuredPosts;
    	let $totalHits;
    	let $analytics;
    	let $frontpageId;
    	let $unique_id;
    	let $show_modal;
    	component_subscribe($$self, featuredPosts, $$value => $$invalidate(14, $featuredPosts = $$value));
    	component_subscribe($$self, totalHits, $$value => $$invalidate(5, $totalHits = $$value));
    	component_subscribe($$self, analytics, $$value => $$invalidate(6, $analytics = $$value));
    	component_subscribe($$self, frontpageId, $$value => $$invalidate(20, $frontpageId = $$value));
    	component_subscribe($$self, unique_id, $$value => $$invalidate(21, $unique_id = $$value));
    	component_subscribe($$self, show_modal, $$value => $$invalidate(7, $show_modal = $$value));
    	const mode = "production";
    	const dispatch = createEventDispatcher();
    	let { frontpage_id } = $$props;
    	let { frontpageengine_wssb_address } = $$props;
    	let { url } = $$props;
    	let { uid } = $$props;
    	let updating = false;
    	let show_group_actions = false;
    	let messages = [];
    	let socket = null;

    	onMount(async () => {
    		try {
    			set_store_value(unique_id, $unique_id = uid, $unique_id);
    			set_store_value(frontpageId, $frontpageId = frontpage_id, $frontpageId);
    			socket = new FrontPageEngineSocketServer(frontpageengine_wssb_address, url, `frontpage-${frontpage_id}`, uid);

    			socket.on("frontpage_updated", async message => {
    				if (uid === message.sender) return;
    				await getPosts();
    			});
    		} catch(e) {
    		}

    		await getPosts();
    		await getAnalytics();
    		setInterval(getPosts, 600000); // Check posts every 10 minutes
    		setInterval(getAnalytics, 60000); // Check analytics every minute
    	});

    	onDestroy(() => {
    		try {
    			socket.close();
    		} catch(e) {
    		}
    	});

    	const getPosts = async () => {
    		const wp_posts = await apiGet(`frontpageengine/v1/get_posts/${frontpage_id}?${""}`);
    		set_store_value(featuredPosts, $featuredPosts = wp_posts.posts.map(map_posts), $featuredPosts);
    	};

    	const getAnalytics = async () => {
    		{
    			set_store_value(analytics, $analytics = Object.values((await apiGet(`frontpageengine/v1/analytics/${frontpage_id}`)).analytics), $analytics);
    		}

    		set_store_value(totalHits, $totalHits = $analytics.reduce((a, b) => a + b.hits_last_hour, 0), $totalHits);
    	};

    	const updated = async () => {
    		// socket.sendMessage({ name: "frontpage_updated", message: "Updated front page", uuid });
    		await getAnalytics();
    	};

    	const autoSort = async () => {
    		try {
    			$$invalidate(2, updating = true);
    			const wp_posts = await apiGet(`frontpageengine/v1/autosort/${frontpage_id}?${mode === "development" ? "simulate_analytics=1" : ""}`);
    			set_store_value(featuredPosts, $featuredPosts = wp_posts.posts.map(map_posts), $featuredPosts);
    		} catch(error) {

    			messages.push({
    				type: "error",
    				message: error.message || error
    			});

    			$$invalidate(1, messages);
    		} finally {
    			$$invalidate(2, updating = false); // console.log(messages);
    		}
    	};

    	let group_action;

    	const onGroupAction = async () => {

    		if (group_action === "remove") {
    			if (confirm("Are you sure you want to remove these posts?")) {
    				const posts = $featuredPosts.filter(post => post.checked);

    				for (let post of posts) {
    					try {
    						set_store_value(featuredPosts, $featuredPosts = (await apiPost(`frontpageengine/v1/remove_post/${post.slot.frontpage_id}`, { post_id: post.id })).posts.map(map_posts), $featuredPosts);
    					} catch(e) {
    					}
    				}

    				dispatch("updated");
    			}
    		}

    		$$invalidate(4, group_action = "0");
    	};

    	const click_handler = () => set_store_value(show_modal, $show_modal = true, $show_modal);
    	const click_handler_1 = () => autoSort();

    	function select_change_handler() {
    		group_action = select_value(this);
    		$$invalidate(4, group_action);
    	}

    	const close_handler = () => set_store_value(show_modal, $show_modal = false, $show_modal);

    	$$self.$$set = $$props => {
    		if ('frontpage_id' in $$props) $$invalidate(0, frontpage_id = $$props.frontpage_id);
    		if ('frontpageengine_wssb_address' in $$props) $$invalidate(11, frontpageengine_wssb_address = $$props.frontpageengine_wssb_address);
    		if ('url' in $$props) $$invalidate(12, url = $$props.url);
    		if ('uid' in $$props) $$invalidate(13, uid = $$props.uid);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$featuredPosts, messages*/ 16386) {
    			if ($featuredPosts.length > 0) {
    				// $featuredPosts = applySlots($featuredPosts, $slots);
    				// $featuredPosts = applyAnalytics($featuredPosts, $analytics);
    				$$invalidate(3, show_group_actions = $featuredPosts.filter(post => post.checked).length > 0);
    			}
    		}
    	};

    	return [
    		frontpage_id,
    		messages,
    		updating,
    		show_group_actions,
    		group_action,
    		$totalHits,
    		$analytics,
    		$show_modal,
    		updated,
    		autoSort,
    		onGroupAction,
    		frontpageengine_wssb_address,
    		url,
    		uid,
    		$featuredPosts,
    		click_handler,
    		click_handler_1,
    		select_change_handler,
    		close_handler
    	];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance,
    			create_fragment,
    			safe_not_equal,
    			{
    				frontpage_id: 0,
    				frontpageengine_wssb_address: 11,
    				url: 12,
    				uid: 13
    			},
    			add_css
    		);
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
            frontpageengine_wssb_address: ajax_var.frontpageengine_wssb_address,
            uid: ajax_var.uid,
        }
    });

    return app;

})();
//# sourceMappingURL=frontpage_engine.js.map
