/* ==========================================================================
ANIMETA GRAPH STUDIO
Architecture : IIFE + namespace public (window.GraphStudio)
========================================================================== */

(function (window, $) {
    'use strict';

    /* ======================================================================
    1. DONNÉES SOURCE (ACTIONS)
    ====================================================================== */

    const json_actions = `
    [
        {
            "name": "Eat",
            "id": "A",
            "subtype": "Eat",
            "attributs": [
                { "name": "duration", "type": "int" },
                { "name": "gain", "type": "float" },
                { "name": "kill", "type": "int" },
                { "name": "move_coast", "type": "float" }
            ]
        },
        {
            "name": "GetCloser",
            "id": "A",
            "subtype": "GetCloser",
            "attributs": [
                { "name": "duration", "type": "int" },
                { "name": "target", "type": "string" },
                { "name": "max_attempt", "type": "int" }
            ]
        },
        {
            "name": "RandomMove",
            "id": "A",
            "subtype": "RandomMove",
            "attributs": [
                { "name": "duration", "type": "int" },
                { "name": "move_probability", "type": "float" },
                { "name": "max_velocity", "type": "string" },
                { "name": "max_attempt", "type": "float" },
                { "name": "lost", "type": "float" }
            ]
        },
        {
            "name": "Rest",
            "id": "A",
            "subtype": "Rest",
            "attributs": [
                { "name": "duration", "type": "int" }
            ]
        },
        {
            "name": "RunAway",
            "id": "A",
            "subtype": "RunAway",
            "attributs": [
                { "name": "duration", "type": "int" },
                { "name": "move_coast", "type": "float" }
            ]
        },
        {
            "name": "Sleep",
            "id": "A",
            "subtype": "Sleep",
            "attributs": [
                { "name": "duration", "type": "int" },
                { "name": "gain", "type": "float" }
            ]
        },
        {
            "name": "StayOnCourse",
            "id": "A",
            "subtype": "StayOnCourse",
            "attributs": [
                { "name": "duration", "type": "int" },
                { "name": "acceleration", "type": "string" }
            ]
        }
    ]`;

    let actions = [];
    try {
        actions = JSON.parse(json_actions);
    } catch (e) {
        console.error('JSON actions invalide :', e);
        actions = [];
    }

    /* ======================================================================
    2. ÉTAT GLOBAL DU MODULE
    ====================================================================== */

    // ⚠️ let (et non const) car on réassigne l'objet lors des imports
    let graphState = { nodes: {}, connections: [] };
    let nodeCounter = 0;
    let selectedNodeId = null;
    let linkModeSourceId = null;
    let zoomLevel = 1;

    let loadedModel = {
        modelName: null,
        filename: null,
        id: null
    };

    let $canvas = null; // initialisé dans init()

    /* ======================================================================
    3. CONFIGURATION (RÈGLES MÉTIER)
    ====================================================================== */

    const connectionRules = {
        "M": ["Ps", "Ds", "T"],

        "Ps": ["P"],
        "P": ["S"],
        "Ds": ["D", "PD", "P"],

        "D": ["T", "P"],
        "T": ["A"],

        "PM": ["Ps", "Ds", "PT", "T"],

        "PD": ["PT", "PK", "P"],
        "PT": ["A", "PA"],
        "PA": ["PK"]

    };

    const connectionLimits = {
        "PM": { "PT": 1, "Ds": 1, "Ps": 1 },

        "M": { "T": 1, "Ds": 1, "Ps": 1 },

        "P":  { "PM": 1 }
    };

    const incomingLimits = {
        "M": 0, "PM": 0, 
        "Ps":1,  "Ds":1, "T":1,
        "S": 1, 
        "PD": 1, "D": 1, 
        "A": 1,
        "PA": 1, "PK": 1, "PT": 1
    };

    /* --- Construction dynamique du schéma des actions -------------------- */

    const actionsSchema = {};
    const actionKeyMap = {}; // "Ax1" -> objet action (utile pour debug/export)

    actions.forEach((action, index) => {
        const key = `A${index + 1}`;
        actionKeyMap[key] = action;

        const schema = [
            {
                name: "action",
                label: "A",
                type: "text",
                options: actions.map(a => a.subtype),
                default: action.subtype,
                readonly: true
            }
        ];

        (action.attributs || []).forEach(attr => {
            schema.push({
                name: attr.name,
                label: attr.name.charAt(0).toUpperCase() + attr.name.slice(1),
                type: (attr.type === 'int' || attr.type === 'float') ? 'number' : 'text',
                default: (attr.type === 'int' || attr.type === 'float') ? 0 : ''
            });
        });

        actionsSchema[key] = schema;
    });

    const propertiesSchema = {
        "PM": [
            { name: "name", type: "text", default: "" }
        ],
        "M": [
            { name: "name", type: "text", default: "" }
        ],
        "P": [
            { name: "name", type: "text", default: "" },
            { name: "strength expression", type: "text", default: "" }
        ],
        "PD": [
            { name: "name", type: "text", default: "" },
            { name: "test string", type: "text", default: "" },
            { name: "description", type: "text", default: "" }
        ],
        "S": [
            { name: "target", type: "text", default: "" },
            { name: "radius", type: "number", default: "" },
            { name: "angle", type: "number", default: "" },
            { name: "strength expression", type: "text", default: "" },
            { name: "default", type: "text", default: "" }
        ],
        "PA": [
            { name: "name", type: "text", default: "" }
        ],
        "PK": [
            { name: "attribute", type: "text", default: "" },
            { name: "type", type: "text", default: "float" },
            { name: "range start point", type: "number", default: "0" },
            { name: "range end point", type: "number", default: "10" },
            { name: "values", type: "number", default: "" }
        ],
        ...actionsSchema
    };



    /* ======================================================================
    4. UTILITAIRES
    ====================================================================== */

    /** Type générique : "Ax1" / "Ax_Eat" -> "Ax" ; "PM" -> "PM" */
    function genericType(type) {
        if (!type) return '';
        const base = String(type).split('_')[0];
        const m = base.match(/^([A-Za-z]+)/);
        return m ? m[1] : base;
    }

    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"');
    }

    function log(message, type) {
        type = type || 'info';
        const icons = {
            info:    'bi-info-circle',
            error:   'bi-x-circle',
            success: 'bi-check-circle'
        };
        const $console = $('#consoleLog');
        if (!$console.length) {
            console.log('[GraphStudio]', message);
            return;
        }
        const $line = $('<div class="log-line log-' + type + '"></div>')
            .append('<span class="log-time">' + new Date().toLocaleTimeString() + '</span>')
            .append('<i class="bi ' + (icons[type] || icons.info) + ' log-icon"></i>')
            .append('<span class="log-msg">' + message + '</span>');
        $console.append($line);
        $console.scrollTop($console[0].scrollHeight);
    }

    function showToast(message, type) {
        const bg = (type === 'error') ? '#f87171' : '#4ade80';
        const $toast = $('<div></div>')
            .text(message)
            .css({
                position: 'fixed', top: '70px', right: '20px',
                background: bg, color: '#fff', padding: '12px 20px',
                borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,.3)',
                zIndex: 9999, fontSize: '14px', fontWeight: 600
            });
        $('body').append($toast);
        setTimeout(function () {
            $toast.fadeOut(300, function () { $(this).remove(); });
        }, 3000);
    }

    /* ======================================================================
    5. RENDU / MANIPULATION DU GRAPHE
    ====================================================================== */

    function initSvgDefs() {
        const svg = document.getElementById('connectionsSvg');
        if (!svg || svg.querySelector('defs')) return;
        const NS = 'http://www.w3.org/2000/svg';
        const defs = document.createElementNS(NS, 'defs');
        defs.innerHTML =
            '<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">' +
            '<polygon points="0 0, 10 3.5, 0 7" fill="#7c5cff"/></marker>';
        svg.appendChild(defs);
    }

    function drawConnectionLine(fromId, toId) {
        const $from = $('#' + fromId);
        const $to = $('#' + toId);
        if (!$from.length || !$to.length) return;

        const f = $from.position();
        const t = $to.position();
        const NS = 'http://www.w3.org/2000/svg';
        const line = document.createElementNS(NS, 'line');

        line.setAttribute('x1', f.left + $from.outerWidth() / 2);
        line.setAttribute('y1', f.top + $from.outerHeight() / 2);
        line.setAttribute('x2', t.left + $to.outerWidth() / 2);
        line.setAttribute('y2', t.top + $to.outerHeight() / 2);
        line.setAttribute('stroke', '#7c5cff');
        line.setAttribute('stroke-width', '2.5');
        line.setAttribute('marker-end', 'url(#arrowhead)');
        line.setAttribute('opacity', '0.85');

        document.getElementById('connectionsSvg').appendChild(line);
    }

    function redrawAllConnections() {
        const svg = document.getElementById('connectionsSvg');
        if (!svg) return;
        svg.querySelectorAll('line').forEach(l => l.remove());
        graphState.connections.forEach(c => drawConnectionLine(c.from, c.to));
    }

    function renderNode(node) {
        const $node = $('<div class="graph-node"></div>')
            .attr('id', node.id)
            .attr('data-type', node.type)
            .css({ left: node.x + 'px', top: node.y + 'px' })
            .text(node.data.name || node.type);

        $canvas.append($node);

        if ($.fn.draggable) {
            $node.draggable({
                containment: '#graphCanvas',
                start: function () { $(this).css('z-index', 10); },
                drag: redrawAllConnections,
                stop: function (e, ui) {
                    node.x = ui.position.left;
                    node.y = ui.position.top;
                    $(this).css('z-index', 5);
                    redrawAllConnections();
                }
            });
        }

        if ($.fn.droppable) {
            $node.droppable({
                accept: '.graph-node',
                tolerance: 'pointer',
                over: function (e, ui) {
                    if (ui.draggable.attr('id') !== node.id) $(this).addClass('drag-over');
                },
                out: function () { $(this).removeClass('drag-over'); }
            });
        }

        $node.on('click', function (e) {
            e.stopPropagation();
            handleNodeClick(node.id);
        });
    }

    function createNode(type, label, x, y) {
        /*if (!propertiesSchema[type]) {
            log('Unknown component type: "' + escapeHtml(type) + '"', 'error');
            return null;
        }*/
        const id = 'node_' + (++nodeCounter);
        $('#emptyHint').hide();

        const data = {};


        (propertiesSchema[type] || []).forEach(f => { data[f.name] = f.default;});

        data.name = label;

        graphState.nodes[id] = { id: id, type: type, x: x, y: y, data: data };

        renderNode(graphState.nodes[id]);
        log('Component "<strong>' + escapeHtml(label) + '</strong>" added to the graph', 'success');
        return id;
    }

    function clearCanvas(askConfirmation) {
        if (askConfirmation && !confirm('Clear the graph?')) return false;

        graphState.nodes = {};
        graphState.connections = [];
        nodeCounter = 0;
        selectedNodeId = null;
        linkModeSourceId = null;

        if ($canvas) $canvas.find('.graph-node').remove();
        $('#connectionsSvg').find('line').remove();
        selectNode(null);
        $('#emptyHint').show();
        return true;
    }

    function deleteNode(nodeId) {
        const node = graphState.nodes[nodeId];
        if (!node) return;

        const label = node.data.name || node.type;
        if (!confirm('Delete the component "' + label + '"?\nIts connections will also be removed.')) return;

        $('#' + nodeId).remove();

        const before = graphState.connections.length;
        graphState.connections = graphState.connections.filter(
            c => c.from !== nodeId && c.to !== nodeId
        );
        const removed = before - graphState.connections.length;

        delete graphState.nodes[nodeId];
        redrawAllConnections();

        if (selectedNodeId === nodeId) selectNode(null);
        if (Object.keys(graphState.nodes).length === 0) $('#emptyHint').show();

        log('Component "<strong>' + escapeHtml(label) + '</strong>" deleted (' +
            removed + ' connection(s) removed)', 'success');
        showToast('"' + label + '" deleted', 'error');
    }

    /* ======================================================================
    6. CONNEXIONS
    ====================================================================== */

    function handleNodeClick(nodeId) {
        if (linkModeSourceId && linkModeSourceId !== nodeId) {
            attemptConnection(linkModeSourceId, nodeId);
            $('#' + linkModeSourceId).removeClass('link-source');
            linkModeSourceId = null;
            return;
        }
        selectNode(nodeId);
    }

    function attemptConnection(fromId, toId) {
        const fromNode = graphState.nodes[fromId];
        const toNode = graphState.nodes[toId];
        if (!fromNode || !toNode) return;

        const fromT = genericType(fromNode.type);
        const toT = genericType(toNode.type);

        // Règle 1 : type de cible autorisé ?
        if (!(connectionRules[fromT] || []).includes(toT)) {
            log('Connection refused: "' + fromT + '" → "' + toT + '" not allowed', 'error');
            showToast('Invalid rule: ' + fromT + ' → ' + toT, 'error');
            return;
        }

        // Règle 2 : doublon ?
        if (graphState.connections.some(c => c.from === fromId && c.to === toId)) {
            log('This connection already exists', 'error');
            showToast('Connection already exists', 'error');
            return;
        }

        // Règle 3 : limite sortante (source -> type cible)
        const limits = connectionLimits[fromT];
        if (limits && limits[toT] !== undefined) {
            const max = limits[toT];
            const count = graphState.connections.filter(c =>
                c.from === fromId && genericType(graphState.nodes[c.to].type) === toT
            ).length;

            if (count >= max) {
                const label = fromNode.data.name || fromT;
                log('Connection refused: "' + escapeHtml(label) + '" already reached its limit of ' +
                    max + ' connection(s) to "' + toT + '"', 'error');
                showToast('Limit reached: ' + fromT + ' → ' + toT + ' (max ' + max + ')', 'error');
                return;
            }
        }

        // Règle 4 : limite entrante globale de la cible
        const maxIn = incomingLimits[toT];
        if (maxIn !== undefined) {
            const currentIn = graphState.connections.filter(c => c.to === toId).length;
            if (currentIn >= maxIn) {
                const label = toNode.data.name || toT;
                log('Connection refused: "' + escapeHtml(label) + '" already reached its limit of ' +
                    maxIn + ' incoming connection(s)', 'error');
                showToast('Limit reached: ' + toT + ' can only receive ' + maxIn + ' connection(s)', 'error');
                return;
            }
        }

        graphState.connections.push({ from: fromId, to: toId });
        redrawAllConnections();
        log('Connection created: <strong>' + escapeHtml(fromNode.data.name || fromId) +
            '</strong> → <strong>' + escapeHtml(toNode.data.name || toId) + '</strong>', 'success');
    }

    /* ======================================================================
    7. PANNEAU DE PROPRIÉTÉS
    ====================================================================== */

    function selectNode(nodeId) {
        selectedNodeId = nodeId;
        $('.graph-node').removeClass('selected');

        if (!nodeId || !graphState.nodes[nodeId]) {
            selectedNodeId = null;
            $('#noSelectionMsg').show();
            $('#propertiesForm').hide().empty();
            return;
        }

        $('#' + nodeId).addClass('selected');
        const node = graphState.nodes[nodeId];
        const schema = propertiesSchema[node.type] || [];

        $('#noSelectionMsg').hide();
        const $form = $('#propertiesForm').empty().show();

        $form.append(
            '<div class="node-header-badge">' +
                '<div class="badge-icon">' + escapeHtml(genericType(node.type)) + '</div>' +
                '<div class="badge-text">' +
                    '<strong>' + escapeHtml(node.data.name || node.type) + '</strong>' +
                    '<small>ID: ' + escapeHtml(node.id) + '</small>' +
                '</div>' +
            '</div>'
        );

        schema.forEach(function (field) {
            const value = (node.data[field.name] !== undefined) ? node.data[field.name] : field.default;
            const $group = $('<div class="form-group"></div>')
                .append('<label class="form-label">' + escapeHtml(field.label || field.name) + '</label>');

            let $input;

            if (field.type === 'textarea') {
                $input = $('<textarea class="form-control form-control-sm" rows="3"></textarea>').val(value);
            } else if (field.type === 'select') {
                $input = $('<select class="form-select form-select-sm"></select>');
                (field.options || []).forEach(function (opt) {
                    const v = (typeof opt === 'string') ? opt : opt.value;
                    const t = (typeof opt === 'string') ? opt : opt.text;
                    $('<option></option>').attr('value', v).text(t)
                        .prop('selected', String(v) === String(value))
                        .appendTo($input);
                });
            } else {
                $input = $('<input class="form-control form-control-sm">')
                    .attr('type', field.type || 'text').val(value);
            }

            $input.attr('data-field', field.name);

            // Champ en lecture seule : on désactive SANS empêcher la sérialisation
            if (field.readonly) {
                $input.prop('readonly', true).prop('disabled', true).addClass('is-readonly');
            }

            $group.append($input);
            $form.append($group);
        });

        $form.append(
            '<div class="text-center mt-3" style="font-size:12px;color:var(--text-secondary);">' +
            '<i class="bi bi-keyboard"></i> Press <kbd>Delete</kbd> to remove this component</div>'
        );

        // Un seul binding, filtré sur les champs éditables
        $form.find('[data-field]').not('.is-readonly').on('input change', function () {
            const fieldName = $(this).data('field');
            const value = $(this).val();
            node.data[fieldName] = value;

            if (fieldName === 'name') {
                $('#' + node.id).text(value);
                $form.find('.node-header-badge strong').text(value);
                redrawAllConnections();
            }
            log('Property "' + escapeHtml(fieldName) + '" updated → "' + escapeHtml(value) + '"');
        });
    }

    /* ======================================================================
    8. IMPORT / EXPORT / CHARGEMENT
    ====================================================================== */

    /**
     * Hydrate le graphe depuis un objet {nodes, connections}.
     * `nodes` accepte un tableau OU un objet indexé par id.
     */
    function hydrateGraph(model) {
        if (!model) {
            showToast('Invalid project data', 'error');
            return false;
        }
        const src = model.graphState ? model.graphState : model;
        const rawNodes = src.nodes;
        const rawConns = Array.isArray(src.connections) ? src.connections : [];

        if (!rawNodes || typeof rawNodes !== 'object') {
            log('Invalid project data: nodes missing', 'error');
            showToast('Invalid project data: nodes missing', 'error');
            return false;
        }

        clearCanvas(false);

        const list = Array.isArray(rawNodes) ? rawNodes : Object.values(rawNodes);

        list.forEach(function (n) {
            if (!n || !n.id) return;
            /*
            if (!propertiesSchema[n.type]) {
                log('Unknown component type ignored: "' + escapeHtml(n.type) + '"', 'error');
                return;
            }
            */

            graphState.nodes[n.id] = {
                id: n.id,
                type: n.type,
                x: Number(n.x) || 0,
                y: Number(n.y) || 0,
                data: n.data || {}
            };
            renderNode(graphState.nodes[n.id]);

            const num = parseInt(String(n.id).replace('node_', ''), 10);
            if (!isNaN(num) && num > nodeCounter) nodeCounter = num;
        });

        rawConns.forEach(function (c) {
            if (graphState.nodes[c.from] && graphState.nodes[c.to]) {
                graphState.connections.push({ from: c.from, to: c.to });
            }
        });

        redrawAllConnections();
        $('#emptyHint').toggle(Object.keys(graphState.nodes).length === 0);

        log('Project loaded: <strong>' + Object.keys(graphState.nodes).length +
            '</strong> nodes, <strong>' + graphState.connections.length + '</strong> connections', 'success');
        return true;
    }

    function loadGraphFromJSON(data) {
        if (!data || !data.nodes) {
            log("Invalid JSON structure: missing 'nodes' property", 'error');
            showToast('Invalid JSON structure', 'error');
            return;
        }
        if (!confirm('Importing this file will replace the current graph. Continue?')) return;

        if (hydrateGraph(data)) showToast('Import successful', 'success');
    }

    function exportGraphToJSON() {
        return {
            meta: {
                appName: 'GraphStudio',
                version: '1.0',
                exportedAt: new Date().toISOString(),
                nodeCount: Object.keys(graphState.nodes).length,
                connectionCount: graphState.connections.length
            },
            nodes: Object.values(graphState.nodes).map(n => ({
                id: n.id, type: n.type, x: n.x, y: n.y, data: n.data
            })),
            connections: graphState.connections.map(c => ({ from: c.from, to: c.to }))
        };
    }

    function downloadGraphAsJSON() {
        const data = exportGraphToJSON();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        const filename = 'Animeta-export-' + stamp + '.anmt';

        const $link = $('<a>').attr({ href: url, download: filename }).appendTo('body');
        $link[0].click();
        $link.remove();
        URL.revokeObjectURL(url);

        log('Model: <strong>' + filename + '</strong> (' + data.nodes.length +
            ' component(s), ' + data.connections.length + ' connection(s))', 'success');
        showToast('Export successful: ' + filename, 'success');
    }

    /** Appelée depuis le HTML : onclick="GraphStudio.openProject('id')" */
    function openProject(id) {
        $.ajax({
            url: '/modeling/api/project/' + encodeURIComponent(id),
            method: 'GET',
            dataType: 'json'
        })
        .done(function (response) {
            let model = response && response.data ? response.data.jsondata : null;
            if (typeof model === 'string') {
                try { model = JSON.parse(model); }
                catch (e) {
                    showToast('Corrupted project data', 'error');
                    return;
                }
            }
            if (!hydrateGraph(model)) return;

            loadedModel.id = id;
            loadedModel.modelName = (model && model.loadedModel && model.loadedModel.modelName) ||
                                    (response.data && response.data.name) || null;
            loadedModel.filename = loadedModel.modelName;

            showToast('Project loaded!', 'success');
            $('#projectModal').fadeOut();
        })
        .fail(function (xhr, status, error) {
            console.error('HTTP error:', error);
            showToast('Failed to load project', 'error');
        });
    }

    /* ======================================================================
    9. VALIDATION
    ====================================================================== */

    /** Retourne null si le nœud est valide, sinon un message d'erreur. */
    function verifyNode(nodeDetails) {
        const t = genericType(nodeDetails.type);

            // a) Les propriétés obligatoires ne doivent pas être vides
            const schema = propertiesSchema[nodeDetails.type] || [];


            const emptyFields = schema
                .filter(f => !f.readonly)
                .filter(f => {
                    const v = nodeDetails.properties[f.name];
                    return v === undefined || v === null || String(v).trim() === '';
                })
                .map(f => f.label || f.name);
            
            if (emptyFields.length) {
                return 'Node "' + (nodeDetails.properties.name || nodeDetails.id) +
                    '" (' + t + '): empty field(s) → ' + emptyFields.join(', ');
            }

        // b) Un nœud non-racine doit avoir un parent (PM = racine)
        if ((t !== 'PM' && t !== 'M') && (nodeDetails.incomingConnections.length === 0) ){
            return 'Node "' + (nodeDetails.properties.name || nodeDetails.id) +
                   '" (' + t + '): no incoming connection (orphan node)';
        }

        // c) Un nœud qui doit propager doit avoir au moins une sortie
        const mustHaveChild = connectionRules[t] && connectionRules[t].length > 0;
        if (mustHaveChild && nodeDetails.outgoingConnections.length === 0) {
            return 'Node "' + (nodeDetails.properties.name || nodeDetails.id) +
                   '" (' + t + '): expects at least one outgoing connection to ' +
                   connectionRules[t].join(' / ');
        }

        return null; // valide
    }

    function verifyAndDisplayGraphDetails() {
        if (Object.keys(graphState.nodes).length === 0) {
            showToast('The graph is empty', 'error');
            log('Empty graph: no node to verify', 'error');
            return false;
        }

        const errors = [];

        Object.keys(graphState.nodes).forEach(function (nodeId) {
            const node = graphState.nodes[nodeId];

            const incoming = graphState.connections.filter(c => c.to === nodeId);
            const outgoing = graphState.connections.filter(c => c.from === nodeId);

            const details = {
                id: node.id,
                type: node.type,
                position: { x: node.x, y: node.y },
                properties: node.data || {},
                incomingConnections: incoming.map(c => ({
                    from: c.from,
                    fromLabel: graphState.nodes[c.from].data.name || graphState.nodes[c.from].type,
                    fromType: graphState.nodes[c.from].type
                })),
                outgoingConnections: outgoing.map(c => ({
                    to: c.to,
                    toLabel: graphState.nodes[c.to].data.name || graphState.nodes[c.to].type,
                    toType: graphState.nodes[c.to].type
                }))
            };
            
            const err = verifyNode(details);
            if (err) errors.push(err);
        });

        if (errors.length === 0) {
            showToast('Your model is valid and can be submitted for processing', 'success');
            log('Your model is valid and can be submitted for processing', 'success');
            return true;
        }

        showToast(errors.length + ' error(s) detected in your model', 'error');
        errors.forEach(e => log('&nbsp;&nbsp;• ' + escapeHtml(e), 'error'));
        return false;
    }

    function validateConnections() {
        let errors = 0;

        graphState.connections.forEach(function (c) {
            const f = genericType(graphState.nodes[c.from].type);
            const t = genericType(graphState.nodes[c.to].type);
            if (!(connectionRules[f] || []).includes(t)) {
                errors++;
                log('Error: ' + f + ' → ' + t + ' not allowed', 'error');
            }
        });

        Object.keys(graphState.nodes).forEach(function (nodeId) {
            const node = graphState.nodes[nodeId];
            const t = genericType(node.type);
            const label = node.data.name || t;

            const limits = connectionLimits[t];
            if (limits) {
                Object.keys(limits).forEach(function (target) {
                    const count = graphState.connections.filter(c =>
                        c.from === nodeId && genericType(graphState.nodes[c.to].type) === target
                    ).length;
                    if (count > limits[target]) {
                        errors++;
                        log('Error: "' + escapeHtml(label) + '" has ' + count +
                            ' connection(s) to "' + target + '" (max ' + limits[target] + ')', 'error');
                    }
                });
            }

            const maxIn = incomingLimits[t];
            if (maxIn !== undefined) {
                const count = graphState.connections.filter(c => c.to === nodeId).length;
                if (count > maxIn) {
                    errors++;
                    log('Error: "' + escapeHtml(label) + '" has ' + count +
                        ' incoming connection(s) (max ' + maxIn + ')', 'error');
                }
            }
        });

        if (errors === 0) {
            log('✓ Validation successful: all connections are valid', 'success');
            showToast('Validation successful!', 'success');
        } else {
            log('Validation completed with ' + errors + ' error(s)', 'error');
            showToast(errors + ' error(s) found', 'error');
        }
        return errors;
    }

    /* ======================================================================
    10. UI : PANNEAU GAUCHE (ACTIONS)
    ====================================================================== */

    function buildActionsPanel() {
        const $panel = $('#leftPanel');
        if (!$panel.length) return;

        const $container = $('<div class="component-group"></div>');
        Object.keys(actionKeyMap).forEach(function (key) {
            const action = actionKeyMap[key];
            $container.append(
                '<div class="component-item" draggable="true" ' +
                'data-type="' + key + '" data-subtype="' + escapeHtml(action.subtype) + '">' +
                '<div class="icon-badge">A</div>' +
                '<span>' + escapeHtml(action.name) + '</span></div>'
            );
        });
        $panel.append($container);
    }

    /* ======================================================================
       11. BINDINGS
       ====================================================================== */

    function bindEvents() {

        /* --- Recherche --- */
        $('#componentSearch').on('input', function () {
            const q = $(this).val().toLowerCase();
            $('.component-item').each(function () {
                $(this).toggle($(this).text().toLowerCase().includes(q));
            });
        });

        /* --- Drag & drop (délégué : couvre les items générés dynamiquement) --- */
        $(document).on('dragstart', '.component-item', function (e) {
            const dt = e.originalEvent.dataTransfer;
            dt.setData('componentType', $(this).data('type'));
            dt.setData('componentLabel', $(this).find('span').text());
            dt.setData('subtype', $(this).data('subtype') || '');
        });

        $canvas.on('dragover', function (e) { e.preventDefault(); });

        $canvas.on('drop', function (e) {
            e.preventDefault();
            const dt = e.originalEvent.dataTransfer;
            const type = dt.getData('componentType');
            const label = dt.getData('componentLabel');
            if (!type) return;

            const off = $canvas.offset();
            const x = (e.originalEvent.pageX - off.left + $canvas.scrollLeft()) / zoomLevel - 65;
            const y = (e.originalEvent.pageY - off.top + $canvas.scrollTop()) / zoomLevel - 25;

            createNode(type, label, Math.max(0, x), Math.max(0, y));
        });

        /* --- Mode connexion (double-clic) --- */
        $canvas.on('dblclick', '.graph-node', function (e) {
            e.stopPropagation();
            if (linkModeSourceId) $('#' + linkModeSourceId).removeClass('link-source');
            linkModeSourceId = $(this).attr('id');
            $(this).addClass('link-source');
            const n = graphState.nodes[linkModeSourceId];
            log('Connection mode enabled from "<strong>' +
                escapeHtml(n.data.name || n.type) + '</strong>". Click on the target.', 'info');
        });

        $canvas.on('click', function () {
            selectNode(null);
            if (linkModeSourceId) $('#' + linkModeSourceId).removeClass('link-source');
            linkModeSourceId = null;
        });

        /* --- Clavier --- */
        $(document).on('keydown', function (e) {
            if ($(e.target).is('input, textarea, select')) return;

            if (e.key === 'Escape') {
                $('#projectModal').fadeOut();
                if (linkModeSourceId) {
                    $('#' + linkModeSourceId).removeClass('link-source');
                    linkModeSourceId = null;
                }
                return;
            }
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
                e.preventDefault();
                deleteNode(selectedNodeId);
            }
        });

        /* --- Import --- */
        $('#btnImportJSON').on('click', function (e) {
            e.preventDefault();
            $('#fileImportInput').trigger('click');
        });

        $('#fileImportInput').on('change', function (e) {
            const file = e.target.files[0];
            const $input = $(this);
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (ev) {
                try {
                    loadGraphFromJSON(JSON.parse(ev.target.result));
                } catch (err) {
                    log('Import error: invalid JSON file', 'error');
                    showToast('Invalid JSON file', 'error');
                } finally {
                    $input.val('');
                }
            };
            reader.readAsText(file);
        });

        /* --- Export --- */
        $('#btnExportJSON').on('click', function (e) {
            e.preventDefault();
            if (Object.keys(graphState.nodes).length === 0) {
                showToast('The graph is empty, nothing to export', 'error');
                return;
            }
            if (!verifyAndDisplayGraphDetails()) return; // ⚠️ appel effectif
            downloadGraphAsJSON();
        });

        /* --- Zoom --- */
        function applyZoom() {
            $canvas.css({ transform: 'scale(' + zoomLevel + ')', transformOrigin: '0 0' });
        }
        $('#zoomIn').on('click',    function () { zoomLevel = Math.min(2, zoomLevel + 0.1); applyZoom(); });
        $('#zoomOut').on('click',   function () { zoomLevel = Math.max(0.5, zoomLevel - 0.1); applyZoom(); });
        $('#resetZoom').on('click', function () { zoomLevel = 1; applyZoom(); });

        /* --- Menus --- */
        $('#btnClearGraph').on('click', function (e) {
            e.preventDefault();
            if (clearCanvas(true)) log('Graph cleared', 'info');
        });

        $('#btnValidateGraph').on('click', function (e) {
            e.preventDefault();
            validateConnections();
        });

        $('#btnVerify').on('click', function (e) {
            e.preventDefault();
            verifyAndDisplayGraphDetails();
        });

        $('#btnAutoLayout').on('click', function (e) {
            e.preventDefault();
            log('Automatic graph layout in progress...', 'info');
        });

        $('#btnRunSimulation').on('click', function (e) {
            e.preventDefault();
            log('Simulation started...', 'info');
        });

        $('#btnNewProject').on('click', function (e) {
            e.preventDefault();
            if (confirm('Do you really want to create a new project? All unsaved current data will be lost.')) {
                location.reload();
            }
        });

        $('#btnGoHome').on('click', function () {
            if (confirm('Do you really want to quit? All unsaved current data will be lost')) {
                window.location.href = '/';
            }
        });

        $('#clearConsole').on('click', function () {
            $('#consoleLog').empty();
            log('Console cleared.');
        });

        /* --- Sauvegarde --- */
        $('#btnSave').on('click', function () {
            if (!loadedModel.modelName) {
                const name = prompt('Save model as :');
                if (!name) return;
                loadedModel.filename = name;
            } else {
                loadedModel.filename = loadedModel.modelName;
            }

            const payload = {
                nodes: graphState.nodes,
                connections: graphState.connections,
                loadedModel: loadedModel
            };

            $.ajax({
                url: '/modeling/save',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(payload)
            })
            
            .done(function () {
                loadedModel.modelName = loadedModel.filename;
                log('Graph saved — ' + Object.keys(graphState.nodes).length + ' nodes, ' +
                    graphState.connections.length + ' connections', 'success');
                showToast('Save successful!', 'success');
            })
            .fail(function (xhr) {
                console.error('Save failed:', xhr.status, xhr.responseText);
                showToast('Save Failed!', 'error');
            });
        });

        /* --- Modale « Ouvrir un projet » --- */
        const $modal = $('#projectModal');
        const $projectList = $('#projectList');

        $('#btnOpenProject').on('click', function (e) {
            e.preventDefault();
            $modal.fadeIn();
            $projectList.html('<p>Chargement...</p>');

            $.ajax({ url: '/modeling/api/projects', method: 'GET', dataType: 'json' })
                .done(function (response) {
                    const items = (response && response.data) || [];
                    if (!items.length) {
                        $projectList.html('<p>Aucun projet trouvé.</p>');
                        return;
                    }
                    const $ul = $('<ul></ul>');
                    items.forEach(function (p) {
                        const date = p.updatedAt ? new Date(p.updatedAt).toLocaleString('fr-FR') : '—';
                        // ✅ Pas de onclick inline : binding jQuery + data-id
                        $('<li></li>')
                            .append(
                                $('<a href="#" class="project-link"></a>')
                                    .attr('data-id', p.id)
                                    .text(p.name + ' (updated at ' + date + ')')
                            )
                            .appendTo($ul);
                    });
                    $projectList.empty().append($ul);
                })
                .fail(function (xhr, status, error) {
                    console.error('HTTP error:', error);
                    $projectList.html('<p class="error">Impossible de charger les projets.</p>');
                });
        });

        $projectList.on('click', '.project-link', function (e) {
            e.preventDefault();
            openProject($(this).data('id'));
        });

        $('.modal-close').on('click', function () { $modal.fadeOut(); });
        $modal.on('click', function (e) { if (e.target === this) $modal.fadeOut(); });

        /* --- Responsive --- */
        $('#toggleLeftPanel').on('click',  function () { $('#leftPanel').slideToggle(); });
        $('#toggleRightPanel').on('click', function () { $('#rightPanel').slideToggle(); });
    }



    const $envmodal = $('#envModal');
    const $envList = $('#envList');

    $('#btnOpenEnv').on('click', function (e) {
        alert("jdj");
        e.preventDefault();
        $envmodal.fadeIn();
    });
    



    /* ======================================================================
       12. INITIALISATION
       ====================================================================== */

    function init() {
        $canvas = $('#graphCanvas');
        if (!$canvas.length) {
            console.error('#graphCanvas introuvable — initialisation annulée.');
            return;
        }

        initSvgDefs();
        buildActionsPanel();
        bindEvents();
        selectNode(null);

        log('Application initialized successfully');
        log('Drag a component from the left panel to the central canvas');
    }

    /* ======================================================================
       13. API PUBLIQUE
       ====================================================================== */

    window.GraphStudio = {
        openProject: openProject,
        loadGraphFromModel: hydrateGraph,
        exportGraph: exportGraphToJSON,
        verify: verifyAndDisplayGraphDetails,
        validate: validateConnections,
        clear: clearCanvas,
        getState: function () { return graphState; },
        getSchema: function () { return propertiesSchema; }
    };

    // Rétro-compatibilité avec l'ancien HTML (onclick="openproject('id')")
    window.openproject = openProject;

    $(init);

})(window, jQuery);