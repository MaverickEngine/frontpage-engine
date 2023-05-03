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
    const frontpageId = writable(0);
    const unique_id = writable(0);

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

    // (15:0) {#if (hits_last_hour !== null)}
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
    	append_styles(target, "svelte-1b8g56e", ".column-image.svelte-1b8g56e.svelte-1b8g56e{width:50px}.column-image.svelte-1b8g56e img.svelte-1b8g56e{width:50px;height:40px;object-fit:cover}.column-title.svelte-1b8g56e.svelte-1b8g56e{width:500px}.badge.svelte-1b8g56e.svelte-1b8g56e{background-color:#0071a1;color:#fff;display:inline-block;padding:0.25em 0.4em;font-size:75%;font-weight:700;line-height:1;text-align:center;white-space:nowrap;vertical-align:baseline;border-radius:0.25rem}");
    }

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    // (13:4) {#if post.image}
    function create_if_block_5(ctx) {
    	let img;
    	let img_src_value;
    	let img_alt_value;

    	return {
    		c() {
    			img = element("img");
    			attr(img, "class", "image svelte-1b8g56e");
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

    // (17:0) {#if (mode=="development")}
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

    // (23:4) {#each post.sections as section}
    function create_each_block$3(ctx) {
    	let span;
    	let t_value = /*section*/ ctx[8] + "";
    	let t;

    	return {
    		c() {
    			span = element("span");
    			t = text(t_value);
    			attr(span, "class", "section badge svelte-1b8g56e");
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

    // (31:8) {:else}
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

    // (29:8) {#if !post.is_blank}
    function create_if_block_3$2(ctx) {
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

    // (35:4) {#if hovering && !post.is_blank}
    function create_if_block_2$2(ctx) {
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

    // (45:4) {#if !post.is_blank}
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

    // (50:4) {#if analytics.find(analytic => post.id === analytic.post_id)}
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
    		if (!/*post*/ ctx[0].is_blank) return create_if_block_3$2;
    		return create_else_block$2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block2 = current_block_type(ctx);
    	let if_block3 = /*hovering*/ ctx[1] && !/*post*/ ctx[0].is_blank && create_if_block_2$2(ctx);
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
    			attr(td0, "class", "column-image svelte-1b8g56e");
    			attr(td1, "class", "column-section");
    			attr(td2, "class", "column-title svelte-1b8g56e");
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
    					if_block3 = create_if_block_2$2(ctx);
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
    	const mode = "development";
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
            console.log({ uid: uid });
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
            manual: !!(Number(post.slot?.manual_order)),
            analytics: post.analytics || {},
            is_blank: !(post.id),
            sections: post.post_sections || [],
        }
    };

    /* src/components/FrontpageTable.svelte generated by Svelte v3.52.0 */

    function add_css$3(target) {
    	append_styles(target, "svelte-16uhaqm", "table.svelte-16uhaqm{border-collapse:collapse}table.is-updating.svelte-16uhaqm{opacity:0.5;pointer-events:none}tr.is-active.svelte-16uhaqm{background-color:rgb(204, 204, 204) !important}tr.is-locked.svelte-16uhaqm{background-color:rgb(250, 232, 238) !important}.column-header-image.svelte-16uhaqm{width:50px}.column-header-title.svelte-16uhaqm{width:500px}.dot-underline.svelte-16uhaqm{text-decoration:underline dotted;cursor:pointer}");
    }

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[22] = list[i];
    	child_ctx[23] = list;
    	child_ctx[24] = i;
    	return child_ctx;
    }

    // (165:12) {#if (mode === "development")}
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

    // (192:16) {#if (!post.locked && !!post.slot.post_id)}
    function create_if_block_3$1(ctx) {
    	let label;
    	let t1;
    	let input;
    	let mounted;
    	let dispose;

    	function input_change_handler() {
    		/*input_change_handler*/ ctx[13].call(input, /*each_value*/ ctx[23], /*index*/ ctx[24]);
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

    			if (dirty & /*$featuredPosts*/ 16) {
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

    // (205:16) {#if (!!post.slot.post_id)}
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

    // (214:20) {:else}
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
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			}
    		});

    	const if_block_creators = [create_if_block_2$1, create_else_block_1];
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

    			if (dirty & /*$$scope, $featuredPosts*/ 33554448) {
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

    // (206:20) {#if (post.locked)}
    function create_if_block_1$1(ctx) {
    	let sveltetooltip0;
    	let t;
    	let sveltetooltip1;
    	let current;

    	sveltetooltip0 = new SvelteTooltip({
    			props: {
    				tip: "This post is locked to this slot.",
    				left: true,
    				color: "#FFB74D",
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			}
    		});

    	sveltetooltip1 = new SvelteTooltip({
    			props: {
    				tip: "Click to edit unlock time.",
    				left: true,
    				color: "#FFB74D",
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(sveltetooltip0.$$.fragment);
    			t = space();
    			create_component(sveltetooltip1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(sveltetooltip0, target, anchor);
    			insert(target, t, anchor);
    			mount_component(sveltetooltip1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const sveltetooltip0_changes = {};

    			if (dirty & /*$$scope, $featuredPosts*/ 33554448) {
    				sveltetooltip0_changes.$$scope = { dirty, ctx };
    			}

    			sveltetooltip0.$set(sveltetooltip0_changes);
    			const sveltetooltip1_changes = {};

    			if (dirty & /*$$scope, $featuredPosts*/ 33554448) {
    				sveltetooltip1_changes.$$scope = { dirty, ctx };
    			}

    			sveltetooltip1.$set(sveltetooltip1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(sveltetooltip0.$$.fragment, local);
    			transition_in(sveltetooltip1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(sveltetooltip0.$$.fragment, local);
    			transition_out(sveltetooltip1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(sveltetooltip0, detaching);
    			if (detaching) detach(t);
    			destroy_component(sveltetooltip1, detaching);
    		}
    	};
    }

    // (215:24) <SvelteTooltip tip="Click to lock this post in this slot." left color="#FFB74D">
    function create_default_slot_4(ctx) {
    	let span;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			span = element("span");
    			attr(span, "class", "dashicons dashicons-unlock");
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

    // (224:24) {:else}
    function create_else_block_1(ctx) {
    	let sveltetooltip;
    	let current;

    	sveltetooltip = new SvelteTooltip({
    			props: {
    				tip: "This slot is automatically ordered.",
    				left: true,
    				color: "#FFB74D",
    				$$slots: { default: [create_default_slot_3] },
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

    			if (dirty & /*$$scope, $featuredPosts*/ 33554448) {
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

    // (219:24) {#if (post.manual)}
    function create_if_block_2$1(ctx) {
    	let sveltetooltip;
    	let current;

    	sveltetooltip = new SvelteTooltip({
    			props: {
    				tip: "This slot is manually ordered.",
    				left: true,
    				color: "#FFB74D",
    				$$slots: { default: [create_default_slot_2$1] },
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

    			if (dirty & /*$$scope, $featuredPosts*/ 33554448) {
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

    // (225:28) <SvelteTooltip tip="This slot is automatically ordered." left color="#FFB74D">
    function create_default_slot_3(ctx) {
    	let span;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			span = element("span");
    			attr(span, "class", "dashicons dashicons-chart-pie");
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

    // (220:28) <SvelteTooltip tip="This slot is manually ordered." left color="#FFB74D">
    function create_default_slot_2$1(ctx) {
    	let span;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			span = element("span");
    			attr(span, "class", "dashicons dashicons-businessperson");
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

    // (207:24) <SvelteTooltip tip="This post is locked to this slot." left color="#FFB74D">
    function create_default_slot_1$1(ctx) {
    	let span;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			span = element("span");
    			attr(span, "class", "dashicons dashicons-lock");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);

    			if (!mounted) {
    				dispose = listen(span, "click", function () {
    					if (is_function(/*doUnlock*/ ctx[10](/*post*/ ctx[22]))) /*doUnlock*/ ctx[10](/*post*/ ctx[22]).apply(this, arguments);
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

    // (211:24) <SvelteTooltip tip="Click to edit unlock time." left color="#FFB74D">
    function create_default_slot$1(ctx) {
    	let span;
    	let t_value = /*formatTime*/ ctx[12](/*post*/ ctx[22].slot.lock_until) + "";
    	let t;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			span = element("span");
    			t = text(t_value);
    			attr(span, "class", "dot-underline svelte-16uhaqm");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, t);

    			if (!mounted) {
    				dispose = [
    					listen(span, "click", function () {
    						if (is_function(/*chooseTime*/ ctx[9](/*post*/ ctx[22]))) /*chooseTime*/ ctx[9](/*post*/ ctx[22]).apply(this, arguments);
    					}),
    					listen(span, "keypress", function () {
    						if (is_function(/*chooseTime*/ ctx[9](/*post*/ ctx[22]))) /*chooseTime*/ ctx[9](/*post*/ ctx[22]).apply(this, arguments);
    					})
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*$featuredPosts*/ 16 && t_value !== (t_value = /*formatTime*/ ctx[12](/*post*/ ctx[22].slot.lock_until) + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (179:8) {#each $featuredPosts as post, index (post.id)}
    function create_each_block$2(key_1, ctx) {
    	let tr;
    	let th0;
    	let t0;
    	let postrow;
    	let t1;
    	let th1;
    	let t2;
    	let tr_id_value;
    	let tr_data_post_id_value;
    	let tr_data_index_value;
    	let tr_data_slot_id_value;
    	let rect;
    	let stop_animation = noop;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = !/*post*/ ctx[22].locked && !!/*post*/ ctx[22].slot.post_id && create_if_block_3$1(ctx);

    	postrow = new PostRow({
    			props: {
    				post: /*post*/ ctx[22],
    				index: /*index*/ ctx[24],
    				hovering: /*rowHovering*/ ctx[3] === /*index*/ ctx[24],
    				total_hits: /*total_hits*/ ctx[1],
    				analytics: /*analytics*/ ctx[2]
    			}
    		});

    	let if_block1 = !!/*post*/ ctx[22].slot.post_id && create_if_block$2(ctx);

    	function mouseover_handler() {
    		return /*mouseover_handler*/ ctx[14](/*index*/ ctx[24]);
    	}

    	function focus_handler() {
    		return /*focus_handler*/ ctx[15](/*index*/ ctx[24]);
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
    			attr(tr, "id", tr_id_value = "post-" + /*post*/ ctx[22].id);
    			attr(tr, "data-post_id", tr_data_post_id_value = /*post*/ ctx[22].id);
    			attr(tr, "data-index", tr_data_index_value = /*index*/ ctx[24]);
    			attr(tr, "data-slot_id", tr_data_slot_id_value = /*post*/ ctx[22].slot.id);
    			attr(tr, "class", "svelte-16uhaqm");
    			toggle_class(tr, "is-active", hovering === /*index*/ ctx[24]);
    			toggle_class(tr, "is-locked", /*post*/ ctx[22].locked);
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
    					listen(tr, "mouseover", mouseover_handler),
    					listen(tr, "focus", focus_handler)
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (!/*post*/ ctx[22].locked && !!/*post*/ ctx[22].slot.post_id) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3$1(ctx);
    					if_block0.c();
    					if_block0.m(th0, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			const postrow_changes = {};
    			if (dirty & /*$featuredPosts*/ 16) postrow_changes.post = /*post*/ ctx[22];
    			if (dirty & /*$featuredPosts*/ 16) postrow_changes.index = /*index*/ ctx[24];
    			if (dirty & /*rowHovering, $featuredPosts*/ 24) postrow_changes.hovering = /*rowHovering*/ ctx[3] === /*index*/ ctx[24];
    			if (dirty & /*total_hits*/ 2) postrow_changes.total_hits = /*total_hits*/ ctx[1];
    			if (dirty & /*analytics*/ 4) postrow_changes.analytics = /*analytics*/ ctx[2];
    			postrow.$set(postrow_changes);

    			if (!!/*post*/ ctx[22].slot.post_id) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*$featuredPosts*/ 16) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$2(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(th1, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*$featuredPosts*/ 16 && tr_id_value !== (tr_id_value = "post-" + /*post*/ ctx[22].id)) {
    				attr(tr, "id", tr_id_value);
    			}

    			if (!current || dirty & /*$featuredPosts*/ 16 && tr_data_post_id_value !== (tr_data_post_id_value = /*post*/ ctx[22].id)) {
    				attr(tr, "data-post_id", tr_data_post_id_value);
    			}

    			if (!current || dirty & /*$featuredPosts*/ 16 && tr_data_index_value !== (tr_data_index_value = /*index*/ ctx[24])) {
    				attr(tr, "data-index", tr_data_index_value);
    			}

    			if (!current || dirty & /*$featuredPosts*/ 16 && tr_data_slot_id_value !== (tr_data_slot_id_value = /*post*/ ctx[22].slot.id)) {
    				attr(tr, "data-slot_id", tr_data_slot_id_value);
    			}

    			if (!current || dirty & /*hovering, $featuredPosts*/ 16) {
    				toggle_class(tr, "is-active", hovering === /*index*/ ctx[24]);
    			}

    			if (!current || dirty & /*$featuredPosts*/ 16) {
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
    	let t13;
    	let th5;
    	let t15;
    	let th6;
    	let t16;
    	let tbody;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let table_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*mode*/ ctx[5] === "development" && create_if_block_4();
    	let each_value = /*$featuredPosts*/ ctx[4];
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
    			th1.textContent = "Section";
    			t7 = space();
    			th2 = element("th");
    			th2.textContent = "Title";
    			t9 = space();
    			th3 = element("th");
    			th3.textContent = "Author";
    			t11 = space();
    			th4 = element("th");
    			th4.textContent = "Published";
    			t13 = space();
    			th5 = element("th");
    			th5.textContent = "Hits";
    			t15 = space();
    			th6 = element("th");
    			t16 = space();
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
    			attr(th1, "class", "manage-column");
    			attr(th2, "scope", "col");
    			attr(th2, "class", "column-header-title svelte-16uhaqm");
    			attr(th3, "scope", "col");
    			attr(th3, "class", "manage-column");
    			attr(th4, "scope", "col");
    			attr(th4, "class", "manage-column");
    			attr(th5, "scope", "col");
    			attr(th5, "class", "manage-column");
    			attr(th6, "scope", "col");
    			attr(th6, "class", "manage-column");
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
    			append(tr, t13);
    			append(tr, th5);
    			append(tr, t15);
    			append(tr, th6);
    			append(table, t16);
    			append(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen(input, "change", /*checkAll*/ ctx[11]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*$featuredPosts, hovering, rowHovering, chooseTime, formatTime, doUnlock, doAuto, doManual, doLock, total_hits, analytics*/ 6110) {
    				each_value = /*$featuredPosts*/ ctx[4];
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

    let hovering = false;

    function instance$5($$self, $$props, $$invalidate) {
    	let $featuredPosts;
    	let $frontpageId;
    	let $unique_id;
    	component_subscribe($$self, featuredPosts, $$value => $$invalidate(4, $featuredPosts = $$value));
    	component_subscribe($$self, frontpageId, $$value => $$invalidate(16, $frontpageId = $$value));
    	component_subscribe($$self, unique_id, $$value => $$invalidate(17, $unique_id = $$value));
    	const mode = "development";
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
    			console.error(e);
    		} finally {
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
    			$featuredPosts = (await apiPost(`frontpageengine/v1/lock_post/${$frontpageId}?${"simulate_analytics=1" }`, {
    				lock_until: formatTimeSql(new Date(lock_until)),
    				post_id: post.slot.post_id
    			})).posts.map(map_posts),
    			$featuredPosts
    		);

    		dispatch("updated");
    		$$invalidate(0, updating = false);
    	};

    	const doManual = async slot => {
    		$$invalidate(0, updating = true);
    		set_store_value(featuredPosts, $featuredPosts = (await apiGet(`frontpageengine/v1/slot/manual/${$frontpageId}/${slot.id}`)).posts.map(map_posts), $featuredPosts);
    		dispatch("updated");
    		$$invalidate(0, updating = false);
    	};

    	const doAuto = async slot => {
    		$$invalidate(0, updating = true);
    		set_store_value(featuredPosts, $featuredPosts = (await apiGet(`frontpageengine/v1/slot/auto/${$frontpageId}/${slot.id}`)).posts.map(map_posts), $featuredPosts);
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
    		set_store_value(featuredPosts, $featuredPosts = (await apiPost(`frontpageengine/v1/unlock_post/${$frontpageId}?${"simulate_analytics=1" }`, { post_id: post.slot.post_id })).posts.map(map_posts), $featuredPosts);
    		$$invalidate(0, updating = false);
    		dispatch("updated");
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

    		jQuery("table.featuredposts tbody").sortable({
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
    				console.log("update");
    				console.log(ui);
    				const post_id = ui.item.data("post_id");
    				const target_index = ui.item.index();
    				const start_index = ui.item.data("index");
    				const slot_id = $featuredPosts[target_index].slot.id;

    				if (start_index !== target_index) {
    					console.log({ post_id, slot_id });
    					doMove(post_id, slot_id);
    				}
    			}
    		});
    	});

    	function input_change_handler(each_value, index) {
    		each_value[index].checked = this.checked;
    		featuredPosts.set($featuredPosts);
    	}

    	const mouseover_handler = index => $$invalidate(3, rowHovering = index);
    	const focus_handler = index => $$invalidate(3, rowHovering = index);

    	$$self.$$set = $$props => {
    		if ('updating' in $$props) $$invalidate(0, updating = $$props.updating);
    		if ('total_hits' in $$props) $$invalidate(1, total_hits = $$props.total_hits);
    		if ('analytics' in $$props) $$invalidate(2, analytics = $$props.analytics);
    	};

    	return [
    		updating,
    		total_hits,
    		analytics,
    		rowHovering,
    		$featuredPosts,
    		mode,
    		doLock,
    		doManual,
    		doAuto,
    		chooseTime,
    		doUnlock,
    		checkAll,
    		formatTime,
    		input_change_handler,
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
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			input = element("input");
    			attr(input, "type", "text");
    			attr(input, "placeholder", "Search");
    		},
    		m(target, anchor) {
    			insert(target, input, anchor);
    			set_input_value(input, /*value*/ ctx[0]);

    			if (!mounted) {
    				dispose = [
    					listen(input, "input", /*input_input_handler*/ ctx[3]),
    					listen(input, "keyup", /*doSearch*/ ctx[1])
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
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { value = "" } = $$props;
    	let { debounce = 500 } = $$props;
    	let timer;

    	const doSearch = () => {
    		clearTimeout(timer);

    		timer = setTimeout(
    			() => {
    				dispatch("search", value);
    			},
    			debounce
    		);
    	};

    	function input_input_handler() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	$$self.$$set = $$props => {
    		if ('value' in $$props) $$invalidate(0, value = $$props.value);
    		if ('debounce' in $$props) $$invalidate(2, debounce = $$props.debounce);
    	};

    	return [value, doSearch, debounce, input_input_handler];
    }

    class Search extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { value: 0, debounce: 2 });
    	}
    }

    /* src/components/AddPostTable.svelte generated by Svelte v3.52.0 */

    function add_css$2(target) {
    	append_styles(target, "svelte-lcq3cs", "table.is-updating.svelte-lcq3cs{opacity:0.5;pointer-events:none}.column-header-image.svelte-lcq3cs{width:50px}.column-header-title.svelte-lcq3cs{width:500px}.frontpageengine-addpost-search.svelte-lcq3cs{margin-bottom:20px}.button.svelte-lcq3cs{margin-bottom:5px}");
    }

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	child_ctx[19] = i;
    	return child_ctx;
    }

    // (81:16) {#if (mode === "development")}
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

    // (95:12) {#each posts as post, index (post.id)}
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
    				post: /*post*/ ctx[17],
    				index: /*index*/ ctx[19],
    				total_hits: /*total_hits*/ ctx[1],
    				analytics: /*analytics*/ ctx[3],
    				hovering: /*rowHovering*/ ctx[5] === /*index*/ ctx[19]
    			}
    		});

    	function mouseover_handler() {
    		return /*mouseover_handler*/ ctx[11](/*index*/ ctx[19]);
    	}

    	function focus_handler() {
    		return /*focus_handler*/ ctx[12](/*index*/ ctx[19]);
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
    			attr(button0, "class", "button svelte-lcq3cs");
    			attr(button1, "class", "button svelte-lcq3cs");
    			attr(button2, "class", "button svelte-lcq3cs");
    			attr(tr, "id", tr_id_value = "post-" + /*post*/ ctx[17].id);
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
    						if (is_function(/*featurePost*/ ctx[7](/*post*/ ctx[17], "top"))) /*featurePost*/ ctx[7](/*post*/ ctx[17], "top").apply(this, arguments);
    					}),
    					listen(button1, "click", function () {
    						if (is_function(/*featurePost*/ ctx[7](/*post*/ ctx[17], "bottom"))) /*featurePost*/ ctx[7](/*post*/ ctx[17], "bottom").apply(this, arguments);
    					}),
    					listen(button2, "click", function () {
    						if (is_function(/*featurePost*/ ctx[7](/*post*/ ctx[17], "auto"))) /*featurePost*/ ctx[7](/*post*/ ctx[17], "auto").apply(this, arguments);
    					}),
    					listen(tr, "mouseover", mouseover_handler),
    					listen(tr, "focus", focus_handler)
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const postrow_changes = {};
    			if (dirty & /*posts*/ 4) postrow_changes.post = /*post*/ ctx[17];
    			if (dirty & /*posts*/ 4) postrow_changes.index = /*index*/ ctx[19];
    			if (dirty & /*total_hits*/ 2) postrow_changes.total_hits = /*total_hits*/ ctx[1];
    			if (dirty & /*analytics*/ 8) postrow_changes.analytics = /*analytics*/ ctx[3];
    			if (dirty & /*rowHovering, posts*/ 36) postrow_changes.hovering = /*rowHovering*/ ctx[5] === /*index*/ ctx[19];
    			postrow.$set(postrow_changes);

    			if (!current || dirty & /*posts*/ 4 && tr_id_value !== (tr_id_value = "post-" + /*post*/ ctx[17].id)) {
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
    	let div1;
    	let div0;
    	let search_1;
    	let updating_value;
    	let t0;
    	let table;
    	let thead;
    	let tr;
    	let td;
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
    	let t15;
    	let th6;
    	let t17;
    	let tbody;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let table_class_value;
    	let current;

    	function search_1_value_binding(value) {
    		/*search_1_value_binding*/ ctx[10](value);
    	}

    	let search_1_props = {};

    	if (/*search*/ ctx[4] !== void 0) {
    		search_1_props.value = /*search*/ ctx[4];
    	}

    	search_1 = new Search({ props: search_1_props });
    	binding_callbacks.push(() => bind(search_1, 'value', search_1_value_binding));
    	search_1.$on("search", /*getPosts*/ ctx[8]);
    	let if_block = /*mode*/ ctx[6] === "development" && create_if_block$1();
    	let each_value = /*posts*/ ctx[2];
    	const get_key = ctx => /*post*/ ctx[17].id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	return {
    		c() {
    			div1 = element("div");
    			div0 = element("div");
    			create_component(search_1.$$.fragment);
    			t0 = space();
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");
    			td = element("td");

    			td.innerHTML = `<label class="screen-reader-text" for="cb-select-all-1">Select All</label> 
                    <input class="cb-select-all-1" type="checkbox"/>`;

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
    			t15 = space();
    			th6 = element("th");
    			th6.textContent = "Insert";
    			t17 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div0, "class", "frontpageengine-addpost-search svelte-lcq3cs");
    			attr(td, "class", "manage-column check-column");
    			attr(th0, "scope", "col");
    			attr(th0, "class", "column-header-image svelte-lcq3cs");
    			attr(th1, "scope", "col");
    			attr(th1, "class", "column-section");
    			attr(th2, "scope", "col");
    			attr(th2, "class", "column-header-title svelte-lcq3cs");
    			attr(th3, "scope", "col");
    			attr(th3, "class", "manage-column");
    			attr(th4, "scope", "col");
    			attr(th4, "class", "manage-column");
    			attr(table, "class", table_class_value = "wp-list-table widefat fixed striped table-view-list featuredposts " + (/*updating*/ ctx[0] ? "is-updating" : "") + " svelte-lcq3cs");
    			attr(div1, "class", "frontpageengine-addpost-container");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);
    			mount_component(search_1, div0, null);
    			append(div1, t0);
    			append(div1, table);
    			append(table, thead);
    			append(thead, tr);
    			append(tr, td);
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
    			append(tr, t15);
    			append(tr, th6);
    			append(table, t17);
    			append(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const search_1_changes = {};

    			if (!updating_value && dirty & /*search*/ 16) {
    				updating_value = true;
    				search_1_changes.value = /*search*/ ctx[4];
    				add_flush_callback(() => updating_value = false);
    			}

    			search_1.$set(search_1_changes);

    			if (dirty & /*posts, rowHovering, featurePost, total_hits, analytics*/ 174) {
    				each_value = /*posts*/ ctx[2];
    				group_outros();
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, tbody, outro_and_destroy_block, create_each_block$1, null, get_each_context$1);
    				check_outros();
    			}

    			if (!current || dirty & /*updating*/ 1 && table_class_value !== (table_class_value = "wp-list-table widefat fixed striped table-view-list featuredposts " + (/*updating*/ ctx[0] ? "is-updating" : "") + " svelte-lcq3cs")) {
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
    			if (detaching) detach(div1);
    			destroy_component(search_1);
    			if (if_block) if_block.d();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};
    }

    let page = 1;
    let per_page = 100;

    function instance$3($$self, $$props, $$invalidate) {
    	let $unfeaturedPosts;
    	let $featuredPosts;
    	component_subscribe($$self, unfeaturedPosts, $$value => $$invalidate(13, $unfeaturedPosts = $$value));
    	component_subscribe($$self, featuredPosts, $$value => $$invalidate(14, $featuredPosts = $$value));
    	const mode = "development";
    	const dispatch = createEventDispatcher();
    	let { frontpage_id } = $$props;
    	let { total_hits = 0 } = $$props;
    	let posts = [];
    	let analytics = [];
    	let search = "";
    	let rowHovering = -1;
    	let { updating = false } = $$props;

    	const featurePost = async (post, position) => {
    		$$invalidate(0, updating = true);

    		try {
    			set_store_value(featuredPosts, $featuredPosts = (await apiPost(`frontpageengine/v1/add_post/${frontpage_id}?${mode === "development" ? "simulate_analytics=1" : ""}`, { post_id: post.id, position })).posts.map(map_posts), $featuredPosts);
    			$$invalidate(2, posts = posts.filter(p => p.id !== post.id));
    			dispatch("updated");
    		} catch(e) {
    			console.error(e);
    		} finally {
    			$$invalidate(0, updating = false);
    		}
    	};

    	const getPosts = async () => {
    		$$invalidate(0, updating = true);

    		try {
    			const result = await apiGet(`frontpageengine/v1/unfeatured_posts/${frontpage_id}?search=${search}&page=${page}&per_page=${per_page}`);
    			set_store_value(unfeaturedPosts, $unfeaturedPosts = result.posts.map(map_posts), $unfeaturedPosts);
    			$$invalidate(2, posts = $unfeaturedPosts);
    			getAnalytics();
    		} catch(e) {
    			console.error(e);
    		} finally {
    			$$invalidate(0, updating = false);
    		}
    	};

    	const getAnalytics = async () => {
    		const post_ids = posts.map(p => p.id);
    		const result = await apiPost(`frontpageengine/v1/analytics?${"simulate_analytics=1" }`, { post_ids });
    		$$invalidate(3, analytics = Object.values(result.analytics));
    	}; // total_hits = analytics.reduce((a, b) => a + b.hits_last_hour, 0);
    	// console.log("totalHits", total_hits);

    	onMount(async () => {
    		getPosts();
    	});

    	function search_1_value_binding(value) {
    		search = value;
    		$$invalidate(4, search);
    	}

    	const mouseover_handler = index => $$invalidate(5, rowHovering = index);
    	const focus_handler = index => $$invalidate(5, rowHovering = index);

    	$$self.$$set = $$props => {
    		if ('frontpage_id' in $$props) $$invalidate(9, frontpage_id = $$props.frontpage_id);
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
    		mode,
    		featurePost,
    		getPosts,
    		frontpage_id,
    		search_1_value_binding,
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
    				frontpage_id: 9,
    				total_hits: 1,
    				updating: 0
    			},
    			add_css$2
    		);
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
            console.log("Received message", message);
            Promise.all(this.callbacks.map(callback => {
                console.log("Checking callback", callback.name, message.data);
                if (callback.name === message.data) {
                    console.log("Calling callback", callback.name);
                    return callback.callback(message);
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
    	append_styles(target, "svelte-4dra5q", ".unordered-posts-alert.svelte-4dra5q{background-color:rgb(213, 57, 57);color:white;border-radius:50%;width:30px;height:30px;text-align:center;top:0;right:0;margin:0px 10px;font-size:15px;line-height:30px;cursor:pointer}.action-bar.svelte-4dra5q{display:flex;justify-content:left;flex-direction:row}.button.svelte-4dra5q{margin-right:10px}");
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[31] = list[i];
    	return child_ctx;
    }

    // (145:8) <Message type={message.type}>
    function create_default_slot_2(ctx) {
    	let t_value = /*message*/ ctx[31].message + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*messages*/ 2 && t_value !== (t_value = /*message*/ ctx[31].message + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (144:4) {#each messages as message}
    function create_each_block(ctx) {
    	let message;
    	let current;

    	message = new Message({
    			props: {
    				type: /*message*/ ctx[31].type,
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
    			if (dirty[0] & /*messages*/ 2) message_changes.type = /*message*/ ctx[31].type;

    			if (dirty[0] & /*messages*/ 2 | dirty[1] & /*$$scope*/ 8) {
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

    // (148:8) {#if $unorderedPosts.length > 0}
    function create_if_block_3(ctx) {
    	let div;
    	let t_value = /*$unorderedPosts*/ ctx[9].length + "";
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
    				dispose = listen(div, "click", /*click_handler*/ ctx[17]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*$unorderedPosts*/ 512 && t_value !== (t_value = /*$unorderedPosts*/ ctx[9].length + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (154:8) {#if show_group_actions}
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
    			if (/*group_action*/ ctx[6] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[20].call(select));
    		},
    		m(target, anchor) {
    			insert(target, select, anchor);
    			append(select, option0);
    			append(select, option1);
    			select_option(select, /*group_action*/ ctx[6]);

    			if (!mounted) {
    				dispose = [
    					listen(select, "change", /*select_change_handler*/ ctx[20]),
    					listen(select, "change", /*onGroupAction*/ ctx[12])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*group_action*/ 64) {
    				select_option(select, /*group_action*/ ctx[6]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(select);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (162:4) {#if show_unordered_modal}
    function create_if_block_1(ctx) {
    	let modal;
    	let current;

    	modal = new Modal({
    			props: {
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			}
    		});

    	modal.$on("close", /*close_handler*/ ctx[21]);

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

    			if (dirty[0] & /*frontpage_id, $totalHits*/ 129 | dirty[1] & /*$$scope*/ 8) {
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

    // (163:4) <Modal on:close="{() => show_unordered_modal = false}">
    function create_default_slot_1(ctx) {
    	let h2;
    	let t1;
    	let addposttable;
    	let current;

    	addposttable = new AddPostTable({
    			props: {
    				frontpage_id: /*frontpage_id*/ ctx[0],
    				type: "unordered",
    				total_hits: /*$totalHits*/ ctx[7]
    			}
    		});

    	addposttable.$on("updated", /*updated*/ ctx[10]);

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
    			if (dirty[0] & /*frontpage_id*/ 1) addposttable_changes.frontpage_id = /*frontpage_id*/ ctx[0];
    			if (dirty[0] & /*$totalHits*/ 128) addposttable_changes.total_hits = /*$totalHits*/ ctx[7];
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

    // (168:4) {#if show_modal}
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

    	modal.$on("close", /*close_handler_1*/ ctx[22]);

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

    			if (dirty[0] & /*frontpage_id, $totalHits*/ 129 | dirty[1] & /*$$scope*/ 8) {
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

    // (169:4) <Modal on:close="{() => show_modal = false}">
    function create_default_slot(ctx) {
    	let addposttable;
    	let current;

    	addposttable = new AddPostTable({
    			props: {
    				frontpage_id: /*frontpage_id*/ ctx[0],
    				total_hits: /*$totalHits*/ ctx[7]
    			}
    		});

    	addposttable.$on("updated", /*updated*/ ctx[10]);

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
    			if (dirty[0] & /*frontpage_id*/ 1) addposttable_changes.frontpage_id = /*frontpage_id*/ ctx[0];
    			if (dirty[0] & /*$totalHits*/ 128) addposttable_changes.total_hits = /*$totalHits*/ ctx[7];
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

    // (170:8) 
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

    	let if_block0 = /*$unorderedPosts*/ ctx[9].length > 0 && create_if_block_3(ctx);
    	let if_block1 = /*show_group_actions*/ ctx[5] && create_if_block_2(ctx);
    	let if_block2 = /*show_unordered_modal*/ ctx[3] && create_if_block_1(ctx);
    	let if_block3 = /*show_modal*/ ctx[2] && create_if_block(ctx);

    	frontpagetable = new FrontpageTable({
    			props: {
    				frontpage_id: /*frontpage_id*/ ctx[0],
    				total_hits: /*$totalHits*/ ctx[7],
    				updating: /*updating*/ ctx[4],
    				analytics: /*$analytics*/ ctx[8]
    			}
    		});

    	frontpagetable.$on("updated", /*updated*/ ctx[10]);

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
    					listen(a0, "click", /*click_handler_1*/ ctx[18]),
    					listen(a1, "click", /*click_handler_2*/ ctx[19])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*messages*/ 2) {
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

    			if (/*$unorderedPosts*/ ctx[9].length > 0) {
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

    			if (/*show_group_actions*/ ctx[5]) {
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

    					if (dirty[0] & /*show_unordered_modal*/ 8) {
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

    					if (dirty[0] & /*show_modal*/ 4) {
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
    			if (dirty[0] & /*frontpage_id*/ 1) frontpagetable_changes.frontpage_id = /*frontpage_id*/ ctx[0];
    			if (dirty[0] & /*$totalHits*/ 128) frontpagetable_changes.total_hits = /*$totalHits*/ ctx[7];
    			if (dirty[0] & /*updating*/ 16) frontpagetable_changes.updating = /*updating*/ ctx[4];
    			if (dirty[0] & /*$analytics*/ 256) frontpagetable_changes.analytics = /*$analytics*/ ctx[8];
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

    function instance($$self, $$props, $$invalidate) {
    	let $featuredPosts;
    	let $totalHits;
    	let $analytics;
    	let $frontpageId;
    	let $unique_id;
    	let $unorderedPosts;
    	component_subscribe($$self, featuredPosts, $$value => $$invalidate(16, $featuredPosts = $$value));
    	component_subscribe($$self, totalHits, $$value => $$invalidate(7, $totalHits = $$value));
    	component_subscribe($$self, analytics, $$value => $$invalidate(8, $analytics = $$value));
    	component_subscribe($$self, frontpageId, $$value => $$invalidate(24, $frontpageId = $$value));
    	component_subscribe($$self, unique_id, $$value => $$invalidate(25, $unique_id = $$value));
    	component_subscribe($$self, unorderedPosts, $$value => $$invalidate(9, $unorderedPosts = $$value));
    	const mode = "development";
    	const dispatch = createEventDispatcher();
    	let { frontpage_id } = $$props;
    	let { frontpageengine_wssb_address } = $$props;
    	let { url } = $$props;
    	let { uid } = $$props;
    	let show_modal = false;
    	let show_unordered_modal = false;
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
    				console.log("Got message", uid, message.sender);
    				if (uid === message.sender) return;
    				await getPosts();
    			});
    		} catch(e) {
    			console.error("Error connecting to websocket server");
    			console.error(e);
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
    			console.error("Error closing websocket connection");
    			console.error(e);
    		}
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
    		// socket.sendMessage({ name: "frontpage_updated", message: "Updated front page", uuid });
    		await getAnalytics();
    	};

    	const autoSort = async () => {
    		try {
    			$$invalidate(4, updating = true);
    			const wp_posts = await apiGet(`frontpageengine/v1/autosort/${frontpage_id}?${mode === "development" ? "simulate_analytics=1" : ""}`);
    			set_store_value(featuredPosts, $featuredPosts = wp_posts.posts.map(map_posts), $featuredPosts);
    		} catch(error) {
    			console.error(error);

    			messages.push({
    				type: "error",
    				message: error.message || error
    			});

    			$$invalidate(1, messages);
    		} finally {
    			$$invalidate(4, updating = false); // console.log(messages);
    		}
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

    		$$invalidate(6, group_action = "0");
    	};

    	const click_handler = () => $$invalidate(3, show_unordered_modal = true);
    	const click_handler_1 = () => $$invalidate(2, show_modal = true);
    	const click_handler_2 = () => autoSort();

    	function select_change_handler() {
    		group_action = select_value(this);
    		$$invalidate(6, group_action);
    	}

    	const close_handler = () => $$invalidate(3, show_unordered_modal = false);
    	const close_handler_1 = () => $$invalidate(2, show_modal = false);

    	$$self.$$set = $$props => {
    		if ('frontpage_id' in $$props) $$invalidate(0, frontpage_id = $$props.frontpage_id);
    		if ('frontpageengine_wssb_address' in $$props) $$invalidate(13, frontpageengine_wssb_address = $$props.frontpageengine_wssb_address);
    		if ('url' in $$props) $$invalidate(14, url = $$props.url);
    		if ('uid' in $$props) $$invalidate(15, uid = $$props.uid);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*$featuredPosts, messages*/ 65538) {
    			if ($featuredPosts.length > 0) {
    				// $featuredPosts = applySlots($featuredPosts, $slots);
    				// $featuredPosts = applyAnalytics($featuredPosts, $analytics);
    				$$invalidate(5, show_group_actions = $featuredPosts.filter(post => post.checked).length > 0);

    				console.log(messages);
    			}
    		}
    	};

    	return [
    		frontpage_id,
    		messages,
    		show_modal,
    		show_unordered_modal,
    		updating,
    		show_group_actions,
    		group_action,
    		$totalHits,
    		$analytics,
    		$unorderedPosts,
    		updated,
    		autoSort,
    		onGroupAction,
    		frontpageengine_wssb_address,
    		url,
    		uid,
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

    		init(
    			this,
    			options,
    			instance,
    			create_fragment,
    			safe_not_equal,
    			{
    				frontpage_id: 0,
    				frontpageengine_wssb_address: 13,
    				url: 14,
    				uid: 15
    			},
    			add_css,
    			[-1, -1]
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
//# sourceMappingURL=frontpage_engine.dev.js.map
