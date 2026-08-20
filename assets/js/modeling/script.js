const json_actions = `
[   
    {
        "name": "Eat",
        "id": "Ax",
        "subtype": "Eat",
        "attributs": [
            {"name": "duration", "type": "int"},
            {"name": "gap", "type": "float"}
        ]
    },
    {
        "name": "GetCloser",
        "id": "Ax",
        "subtype": "GetCloser",
        "attributs": [
            {"name": "duration", "type": "int"},
            {"name": "gap", "type": "float"}
        ]
    },
    {
        "name": "Sleep",
        "id": "Ax",
        "subtype": "Sleep",
        "attributs": [
            {"name": "duration", "type": "int"},
            {"name": "gap", "type": "float"}
        ]
    },
    {
        "name": "RandomMove",
        "id": "Ax",
        "subtype": "RandomMove",
        "attributs": [
            {"name": "duration", "type": "int"},
            {"name": "gap", "type": "float"}
        ]
    },
    {
        "name": "RunAway",
        "id": "Ax",
        "subtype": "RunAway",
        "attributs": [
            {"name": "duration", "type": "int"},
            {"name": "gap", "type": "float"}
        ]
    }
]
`;

let loadedModel =  {
    modelName : null,
    id : null
}

const actions = JSON.parse(json_actions);

// 🎯 Build the propertiesSchema from the JSON
const actionsSchema = {};
let b = 0
actions.forEach(action => {
    b += 1;
    //const key = `Ax_${action.subtype}`; // unique key: "Ax_Eat", "Ax_GetCloser", etc.
    const key = `Ax${b}`; // unique key: "Ax_Eat", "Ax_GetCloser", etc. // Add the action_type field (readonly)
    const schema = [
        { 
            name: "action_type", 
            label: "Action type", 
            type: "select",  
            options: actions.map(a => a.subtype), 
            default: action.subtype, 
            readonly: true 
        }
    ];

    // Add attributes from the JSON
    action.attributs.forEach(attr => {
        schema.push({
            name: attr.name,
            label: attr.name.charAt(0).toUpperCase() + attr.name.slice(1), // Capitalize
            type: attr.type === "int" ? "number" : "text",
            default: attr.type === "int" ? 0 : ""
        });
    });

    actionsSchema[key] = schema;
});

$(function() {

    /* ============ CONFIGURATION ============ */
    const connectionRules = {
        "PM": ["P", "D", "PT"],
        "P" : ["Px"],
        "Px": ["Sx"],
        "D": ["PD"],
        "PT": ["Ax", "PA"],
        "Sx": ["PK"],
        "PD": ["PT", "PK", "Px"],
        "PA": ["PK"]
    };

    const connectionLimits = {
        "PM": { "PT": 1, "D": 1, "P": 1 },
        "P": { "PM": 1 },
    };

    const incomingLimits = {
        "Sx": 1,
        "PD": 1,
        "D": 1,
        "Ax": 1,
        "PA": 1,
        "PK": 1,
        "PT": 1,
    };
    const propertiesSchema = {
        "PM": [{ name: "name", type: "text", default: "" }],
        "Px": [{ name: "name", type: "text", default: "" }, { name: "strength expression", type: "text", default: "" }],
        "PD": [{ name: "name", type: "text", default: "" }, { name: "test string", type: "text", default: "" }, { name: "description", type: "text", default: "" }],
        "Sx": [{ name: "target", type: "text", default: "" }, { name: "radius", type: "number", default: "" }, { name: "angle", type: "number", default: "" }, { name: "strength expression", type: "text", default: "" }, { name: "default", type: "text", default: "" }],
        "PA": [{ name: "name", type: "text", default: "" }],
        "PK": [{ name: "attribute", type: "text", default: "" }, { name: "type", type: "text", default: "float" }, { name: "range start point", type: "number", default: "0" }, { name: "range end point", type: "number", default: "10" }, { name: "values", type: "number", default: "" }],
        
        // 🎯 Add all Ax subtypes
        ...actionsSchema
    };
    let b = 0;
    // 🎯 Dynamically display actions in the left panel
    actions.forEach(action => {
        b += 1;
        //const actionKey = `Ax_${action.subtype}`;
        const actionKey = `Ax${b}`;
        const code = `
            <div class="component-item" draggable="true" data-type="${actionKey}" data-subtype="${b}">
                <div class="icon-badge">Ax</div>
                <span>${action.name}</span>
            </div>
        `;
        document.getElementById('leftPanel').innerHTML += code;
    });

    /* ============ IMPORT JSON ============ */
    $('#btnImportJSON').on('click', function(e) {
        e.preventDefault();
        $('#fileImportInput').trigger('click');
    });

    $('#fileImportInput').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const importedData = JSON.parse(event.target.result);
                loadGraphFromJSON(importedData);
            } catch (err) {
                log(`Import error: invalid JSON file`, "error");
                showToast("Invalid JSON file", "error");
            }
        };
        reader.readAsText(file);
        $(this).val('');
    });

    function loadGraphFromJSON(importedData) {
        if (!importedData.nodes || !Array.isArray(importedData.nodes)) {
            log("Invalid JSON structure: missing 'nodes' property", "error");
            showToast("Invalid JSON structure", "error");
            return;
        }

        if (!confirm("Importing this file will replace the current graph. Continue?")) {
            return;
        }

        clearCanvas(false);
        graphState = { nodes: {}, connections: [] };
        nodeCounter = 0;
        importedData.nodes.forEach(nodeData => {
            // 🎯 Check against the full type (e.g. "Ax_Eat")
            if (!propertiesSchema[nodeData.type]) {
                log(`Unknown component type ignored: "${nodeData.type}"`, "error");
                return;
            }

            graphState.nodes[nodeData.id] = {
                id: nodeData.id,
                type: nodeData.type,
                x: nodeData.x,
                y: nodeData.y,
                data: nodeData.data || {}
            };

            renderNode(graphState.nodes[nodeData.id]);

            const num = parseInt(nodeData.id.replace('node_', ''), 10);
            if (!isNaN(num) && num > nodeCounter) nodeCounter = num;
        });

        if (Array.isArray(importedData.connections)) {
            importedData.connections.forEach(conn => {
                if (graphState.nodes[conn.from] && graphState.nodes[conn.to]) {
                    graphState.connections.push({ from: conn.from, to: conn.to });
                }
            });
            redrawAllConnections();
        }

        $('#emptyHint').toggle(Object.keys(graphState.nodes).length === 0);
        log(`Graph imported successfully: <strong>${importedData.nodes.length}</strong> component(s), <strong>${importedData.connections?.length || 0}</strong> connection(s)`, "success");
        showToast("Import successful", "success");
    }

    /* ============ EXPORT JSON ============ */
    function exportGraphToJSON() {
        const exportData = {
            meta: {
                appName: "GraphStudio",
                version: "1.0",
                exportedAt: new Date().toISOString(),
                nodeCount: Object.keys(graphState.nodes).length,
                connectionCount: graphState.connections.length
            },
            nodes: Object.values(graphState.nodes).map(node => ({
                id: node.id,
                type: node.type,
                x: node.x,
                y: node.y,
                data: node.data
            })),
            connections: graphState.connections.map(conn => ({
                from: conn.from,
                to: conn.to
            }))
        };
        return exportData;
    }

    $('#btnExportJSON').on('click', function(e) {
        e.preventDefault();

        if (Object.keys(graphState.nodes).length === 0) {
            showToast("The graph is empty, nothing to export", "error");
            return;
        }
        verifyAndDisplayGraphDetails
        downloadGraphAsJSON();
    });

    function downloadGraphAsJSON() {
        const data = exportGraphToJSON();
        const jsonString = JSON.stringify(data, null, 2);

        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        const filename = `Animeta-export-${timestamp}.anmt`;

        const $link = $('<a>')
            .attr('href', url)
            .attr('download', filename)
            .appendTo('body');

        $link[0].click();
        $link.remove();
        URL.revokeObjectURL(url);

        log(`Model: <strong>${filename}</strong> (${data.nodes.length} component(s), ${data.connections.length} connection(s))`, "success");
        showToast(`Export successful: ${filename}`, "success");
    }

    /* ============ DELETION ============ */
    $(document).on('keydown', function(e) {
        const isTyping = $(e.target).is('input, textarea, select');
        if (isTyping) return;

        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
            e.preventDefault();
            deleteNode(selectedNodeId);
        }
    });

    function deleteNode(nodeId) {
        const node = graphState.nodes[nodeId];
        if (!node) return;

        const label = node.data.name || node.type;

        if (!confirm(`Delete the component "${label}"?\nIts connections will also be removed.`)) {
            return;
        }

        $('#' + nodeId).remove();

        const before = graphState.connections.length;
        graphState.connections = graphState.connections.filter(
            conn => conn.from !== nodeId && conn.to !== nodeId
        );
        const removedConnections = before - graphState.connections.length;

        delete graphState.nodes[nodeId];
        redrawAllConnections();

        if (selectedNodeId === nodeId) {
            selectNode(null);
        }

        if (Object.keys(graphState.nodes).length === 0) {
            $('#emptyHint').show();
        }

        log(`Component "<strong>${label}</strong>" deleted (${removedConnections} connection(s) removed)`, "success");
        showToast(`"${label}" deleted`, "error");
    }

    let nodeCounter = 0;
    const graphState = { nodes: {}, connections: [] };
    let selectedNodeId = null;
    let linkModeSourceId = null;
    let zoomLevel = 1;

    /* ============ CONSOLE LOG ============ */
    function log(message, type = "info") {
        const time = new Date().toLocaleTimeString();
        const icons = { info: 'bi-info-circle', error: 'bi-x-circle', success: 'bi-check-circle' };
        const $line = $(`<div class="log-line log-${type}"></div>`);
        $line.append(`<span class="log-time">${time}</span>`);
        $line.append(`<i class="bi ${icons[type]} log-icon"></i>`);
        $line.append(`<span class="log-msg">${message}</span>`);
        $('#consoleLog').append($line);
        $('#consoleLog').scrollTop($('#consoleLog')[0].scrollHeight);
    }

    $('#clearConsole').on('click', function() {
        $('#consoleLog').empty();
        log("Console cleared.");
    });

    /* ============ SEARCH ============ */
    $('#componentSearch').on('input', function() {
        const query = $(this).val().toLowerCase();
        $('.component-item').each(function() {
            const text = $(this).text().toLowerCase();
            $(this).toggle(text.includes(query));
        });
    });

    /* ============ DRAG & DROP ============ */
    $('.component-item').on('dragstart', function(e) {
        e.originalEvent.dataTransfer.setData('componentType', $(this).data('type'));
        e.originalEvent.dataTransfer.setData('componentLabel', $(this).find('span').text());
        e.originalEvent.dataTransfer.setData('subtype', $(this).data('subtype') || '');
    });

    const $canvas = $('#graphCanvas');

    $canvas.on('dragover', function(e) { e.preventDefault(); });

    $canvas.on('drop', function(e) {
        e.preventDefault();
        const type = e.originalEvent.dataTransfer.getData('componentType');
        const label = e.originalEvent.dataTransfer.getData('componentLabel');
        const subtype = e.originalEvent.dataTransfer.getData('subtype');
        
        if (!type) return;

        const offset = $canvas.offset();
        const x = (e.originalEvent.pageX - offset.left + $canvas.scrollLeft()) / zoomLevel - 65;
        const y = (e.originalEvent.pageY - offset.top + $canvas.scrollTop()) / zoomLevel - 25;

        createNode(type, label, Math.max(0, x), Math.max(0, y));
    });

    function createNode(type, label, x, y) {
        const id = 'node_' + (++nodeCounter);
        $('#emptyHint').hide();

        const schema = propertiesSchema[type] || [];
        const defaultData = {};
        
        schema.forEach(field => defaultData[field.name] = field.default);
        defaultData.name = label;

        graphState.nodes[id] = { id, type, x, y, data: defaultData };
        renderNode(graphState.nodes[id]);
        log(`Component "<strong>${label}</strong>" added to the graph`, "success");
    }

    function renderNode(node) {
        const $node = $('<div class="graph-node"></div>')
            .attr('id', node.id)
            .attr('data-type', node.type)
            .css({ left: node.x + 'px', top: node.y + 'px' })
            .text(node.data.name || node.type);

        $canvas.append($node);

        $node.draggable({
            containment: "#graphCanvas",
            start: function() { $(this).css('z-index', 10); },
            drag: function() { redrawAllConnections(); },
            stop: function(e, ui) {
                node.x = ui.position.left;
                node.y = ui.position.top;
                $(this).css('z-index', 5);
                redrawAllConnections();
            }
        });

        $node.droppable({
            accept: '.graph-node',
            tolerance: 'pointer',
            over: function(e, ui) {
                if (ui.draggable.attr('id') !== node.id) $(this).addClass('drag-over');
            },
            out: function() { $(this).removeClass('drag-over'); }
        });

        $node.on('click', function(e) {
            e.stopPropagation();
            handleNodeClick(node.id);
        });
    }

    function handleNodeClick(nodeId) {
        if (linkModeSourceId && linkModeSourceId !== nodeId) {
            attemptConnection(linkModeSourceId, nodeId);
            $('#' + linkModeSourceId).removeClass('link-source');
            linkModeSourceId = null;
            return;
        }
        selectNode(nodeId);
    }

    $canvas.on('dblclick', '.graph-node', function(e) {
        e.stopPropagation();
        if (linkModeSourceId) $('#' + linkModeSourceId).removeClass('link-source');
        linkModeSourceId = $(this).attr('id');
        $(this).addClass('link-source');
        log(`Connection mode enabled from "<strong>${graphState.nodes[linkModeSourceId].data.name}</strong>". Click on the target.`, "info");
    });

    function attemptConnection(fromId, toId) {
        const fromNode = graphState.nodes[fromId];
        const toNode = graphState.nodes[toId];

        // 🎯 Extract the generic type (e.g. "Ax" from "Ax_Eat")
        const fromGenericType = fromNode.type.split('_')[0];
        const toGenericType = toNode.type.split('_')[0];

        // --- Rule 1: allowed type? ---
        const allowedTargets = connectionRules[fromGenericType] || [];
        if (!allowedTargets.includes(toGenericType)) {
            log(`Connection refused: "${fromGenericType}" → "${toGenericType}" not allowed`, "error");
            showToast(`Invalid rule: ${fromGenericType} → ${toGenericType}`, "error");
            return;
        }

        // --- Rule 2: connection already exists? ---
        const exists = graphState.connections.some(c => c.from === fromId && c.to === toId);
        if (exists) {
            log("This connection already exists", "error");
            showToast("Connection already exists", "error");
            return;
        }

        // --- Rule 3: specific limit (source.type → target.type) ---
        const limitsForSourceType = connectionLimits[fromGenericType];
        if (limitsForSourceType && limitsForSourceType[toGenericType] !== undefined) {
            const maxAllowed = limitsForSourceType[toGenericType];
            const currentCount = graphState.connections.filter(c => {
                const cFromGenericType = graphState.nodes[c.from].type.split('_')[0];
                const cToGenericType = graphState.nodes[c.to].type.split('_')[0];
                return c.from === fromId && cFromGenericType === fromGenericType && cToGenericType === toGenericType;
            }).length;

            if (currentCount >= maxAllowed) {
                const label = fromNode.data.name || fromGenericType;
                log(`Connection refused: "${label}" has already reached its limit of ${maxAllowed} connection(s) to "${toGenericType}"`, "error");
                showToast(`Limit reached: ${fromGenericType} → ${toGenericType} (max ${maxAllowed})`, "error");
                return;
            }
        }

        // --- Rule 4: global incoming limit for the target type ---
        const maxIncoming = incomingLimits[toGenericType];
        if (maxIncoming !== undefined) {
            const currentIncoming = graphState.connections.filter(c => c.to === toId).length;
            if (currentIncoming >= maxIncoming) {
                const label = toNode.data.name || toGenericType;
                log(`Connection refused: "${label}" has already reached its limit of ${maxIncoming} incoming connection(s)`, "error");
                showToast(`Limit reached: ${toGenericType} can only receive ${maxIncoming} connection(s)`, "error");
                return;
            }
        }

        // ✅ All rules pass
        graphState.connections.push({ from: fromId, to: toId });
        redrawAllConnections();
        log(`Connection created: <strong>${fromNode.data.name}</strong> → <strong>${toNode.data.name}</strong>`, "success");
    }

    function showToast(message, type) {
        const bgColor = type === 'error' ? '#f87171' : '#4ade80';
        const $toast = $(`<div style="position:fixed; top:70px; right:20px; background:${bgColor}; color:#fff; padding:12px 20px; border-radius:8px; box-shadow:0 4px 15px rgba(0,0,0,0.3); z-index:9999; font-size:14px; font-weight:600;">${message}</div>`);
        $('body').append($toast);
        setTimeout(() => $toast.fadeOut(300, function() { $(this).remove(); }), 3000);
    }

    function redrawAllConnections() {
        const svg = document.getElementById('connectionsSvg');
        svg.querySelectorAll('line').forEach(l => l.remove());
        graphState.connections.forEach(conn => drawConnectionLine(conn.from, conn.to));
    }

    function drawConnectionLine(fromId, toId) {
        const $from = $('#' + fromId);
        const $to = $('#' + toId);
        if (!$from.length || !$to.length) return;

        const fromPos = $from.position();
        const toPos = $to.position();
        const x1 = fromPos.left + $from.outerWidth() / 2;
        const y1 = fromPos.top + $from.outerHeight() / 2;
        const x2 = toPos.left + $to.outerWidth() / 2;
        const y2 = toPos.top + $to.outerHeight() / 2;

        const svgNS = "http://www.w3.org/2000/svg";
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", "#7c5cff");
        line.setAttribute("stroke-width", "2.5");
        line.setAttribute("marker-end", "url(#arrowhead)");
        line.setAttribute("opacity", "0.85");
        document.getElementById('connectionsSvg').appendChild(line);
    }

    function initSvgDefs() {
        const svgNS = "http://www.w3.org/2000/svg";
        const defs = document.createElementNS(svgNS, "defs");
        defs.innerHTML = `<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#7c5cff"/></marker>`;
        document.getElementById('connectionsSvg').appendChild(defs);
    }
    initSvgDefs();

    $canvas.on('click', function() {
        selectNode(null);
        if (linkModeSourceId) $('#' + linkModeSourceId).removeClass('link-source');
        linkModeSourceId = null;
    });

    /* ============ RIGHT PANEL ============ */
    function selectNode(nodeId) {
        selectedNodeId = nodeId;
        $('.graph-node').removeClass('selected');

        if (!nodeId) {
            $('#noSelectionMsg').show();
            $('#propertiesForm').hide().empty();
            return;
        }

        $('#' + nodeId).addClass('selected');
        const node = graphState.nodes[nodeId];
        const schema = propertiesSchema[node.type] || [];

        $('#noSelectionMsg').hide();
        const $form = $('#propertiesForm').empty().show();

        $form.append(`
            <div class="node-header-badge">
                <div class="badge-icon">${node.type}</div>
                <div class="badge-text">
                    <strong>${node.data.name || node.type}</strong>
                    <small>ID: ${node.id}</small>
                </div>
            </div>
        `);

        schema.forEach(field => {
            const currentValue = node.data[field.name] !== undefined ? node.data[field.name] : field.default;
            let $inputGroup = $('<div class="form-group"></div>');
            
            const label = field.label || field.name;
            $inputGroup.append(`<label class="form-label">${label}</label>`);

            let $input;
            
            // 🎯 Readonly field for subtype
            if (field.readonly) {
                $input = $(`<input type="text" class="form-control form-control-sm" readonly>`).val(currentValue);
            } else if (field.type === 'textarea') {
                $input = $(`<textarea class="form-control form-control-sm" rows="3"></textarea>`).val(currentValue);
            } else if (field.type === 'select') {
                $input = $('<select class="form-select form-select-sm"></select>');
                field.options.forEach(opt => {
                    const optValue = typeof opt === 'string' ? opt : opt.value;
                    const optLabel = typeof opt === 'string' ? opt : opt.text;
                    $input.append(`<option value="${optValue}" ${optValue === currentValue ? 'selected' : ''}>${optLabel}</option>`);
                });
            } else {
                $input = $(`<input type="${field.type}" class="form-control form-control-sm">`).val(currentValue);
            }

            $input.attr('data-field', field.name);
            if (field.readonly) $input.prop('disabled', true);
            
            $inputGroup.append($input);
            $form.append($inputGroup);
        });

        $form.append(`
            <div class="text-center mt-3" style="font-size: 12px; color: var(--text-secondary);">
                <i class="bi bi-keyboard"></i> Press <kbd>Delete</kbd> to remove this component
            </div>
        `);

        $form.find('[data-field]').not('[readonly]').on('input change', function() {
            const fieldName = $(this).data('field');
            const value = $(this).val();
            node.data[fieldName] = value;

            if (fieldName === 'name') {
                $('#' + node.id).text(value);
                $('.node-header-badge strong').text(value);
                redrawAllConnections();
            }
            log(`Property "${fieldName}" updated → "${value}"`);
        });
    }

    /* ============ ZOOM ============ */
    function applyZoom() {
        $('#graphCanvas').css('transform', `scale(${zoomLevel})`);
        $('#graphCanvas').css('transform-origin', '0 0');
    }
    
    $('#zoomIn').on('click', function() { zoomLevel = Math.min(2, zoomLevel + 0.1); applyZoom(); });
    $('#zoomOut').on('click', function() { zoomLevel = Math.max(0.5, zoomLevel - 0.1); applyZoom(); });
    $('#resetZoom').on('click', function() { zoomLevel = 1; applyZoom(); });

    /* ============ MENUS ============ */
    $('#btnClearGraph').on('click', function(e) {
        e.preventDefault();
        if (confirm("Are you sure you want to clear the entire graph?")) {
            graphState.nodes = {};
            graphState.connections = [];
            $canvas.find('.graph-node').remove();
            $('#connectionsSvg').find('line').remove();
            selectNode(null);
            $('#emptyHint').show();
            log("Graph cleared", "info");
        }
    });

    function clearCanvas(askConfirmation = true) {
        if (askConfirmation && !confirm("Clear the graph?")) return;
        
        graphState.nodes = {};
        graphState.connections = [];
        $canvas.find('.graph-node').remove();
        $('#connectionsSvg').find('line').remove();
        selectNode(null);
        $('#emptyHint').show();
    }

    $('#btnValidateGraph').on('click', function(e) {
        e.preventDefault();
        let errors = 0;

        graphState.connections.forEach(conn => {
            const fromGenericType = graphState.nodes[conn.from].type.split('_')[0];
            const toGenericType = graphState.nodes[conn.to].type.split('_')[0];
            
            if (!(connectionRules[fromGenericType] || []).includes(toGenericType)) {
                errors++;
                log(`Error: ${fromGenericType} → ${toGenericType} not allowed`, "error");
            }
        });

        Object.keys(graphState.nodes).forEach(nodeId => {
            const node = graphState.nodes[nodeId];
            const nodeGenericType = node.type.split('_')[0];
            const limits = connectionLimits[nodeGenericType];
            
            if (!limits) return;

            Object.keys(limits).forEach(targetType => {
                const maxAllowed = limits[targetType];
                const count = graphState.connections.filter(c => {
                    const cToGenericType = graphState.nodes[c.to].type.split('_')[0];
                    return c.from === nodeId && cToGenericType === targetType;
                }).length;

                if (count > maxAllowed) {
                    errors++;
                    log(`Error: "${node.data.name || nodeGenericType}" has ${count} connection(s) to "${targetType}" (max ${maxAllowed})`, "error");
                }
            });
        });

        Object.keys(graphState.nodes).forEach(nodeId => {
            const node = graphState.nodes[nodeId];
            const nodeGenericType = node.type.split('_')[0];
            const maxIncoming = incomingLimits[nodeGenericType];
            
            if (maxIncoming === undefined) return;

            const count = graphState.connections.filter(c => c.to === nodeId).length;
            if (count > maxIncoming) {
                errors++;
                log(`Error: "${node.data.name || nodeGenericType}" has ${count} incoming connection(s) (max ${maxIncoming})`, "error");
            }
        });

        if (errors === 0) {
            log("✓ Validation successful: all connections are valid", "success");
            showToast("Validation successful!", "success");
        } else {
            log(`Validation completed with ${errors} error(s)`, "error");
            showToast(`${errors} error(s) found`, "error");
        }
    });

    $('#btnAutoLayout').on('click', function(e) {
        e.preventDefault();
        log("Automatic graph layout in progress...", "info");
    });

    $('#btnSave').on('click', async function() {
        graphState.loadedModel = loadedModel;
        const json = JSON.stringify(graphState, null, 2);
        log(`Graph saved — ${Object.keys(graphState.nodes).length} nodes, ${graphState.connections.length} connections`, "success");
        try {
            const response = await fetch('/modeling/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
                body: json
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            const result = await response.json();
            console.log('Success:', result);
            showToast("Save successful!", "success");

        } catch (error) {
            showToast("Save Failed!", "error");
            throw error;
        }

    });

    $('#btnRunSimulation').on('click', function(e) {
        e.preventDefault();
        log("Simulation started...", "info");
    });

    $('#btnOpenProject').on('click', function(e) { e.preventDefault(); alert("This feature will be available soon.") });

    /* ============ RESPONSIVE TOGGLE ============ */
    $('#toggleLeftPanel').on('click', function() { $('#leftPanel').slideToggle(); });
    $('#toggleRightPanel').on('click', function() { $('#rightPanel').slideToggle(); });

    log("Application initialized successfully ");
    log("Drag a component from the left panel to the central canvas");

    $('#btnNewProject').on('click', function(e) {
        e.preventDefault();
        if(confirm("Do you really want to create a new project? All unsaved current data will be lost.")){
            location.reload();
        }
    });

    /* ============ DETAILED GRAPH VERIFICATION ============ */
    $('#btnVerify').on('click', function(e) {
        e.preventDefault();
        verifyAndDisplayGraphDetails();
    });


    document.getElementById('btnGoHome').addEventListener('click', function() {
        if(confirm('Do you really want to quit ? ')){
            window.location.href = '/';
        }
    });


    /**
     * Retrieves and displays the complete details of each node with its connections and properties
     */
    function verifyAndDisplayGraphDetails() {
        if (Object.keys(graphState.nodes).length === 0) {
            showToast("The graph is empty", "error");
            log("Empty graph: no node to verify", "error");
            return;
        }
        const graphReport = {
            totalNodes: Object.keys(graphState.nodes).length,
            totalConnections: graphState.connections.length,
            nodes: []
        };

        let verifyErrors = [];

        // 🎯 Iterate over all nodes
        Object.keys(graphState.nodes).forEach((nodeId, index) => {
            const node = graphState.nodes[nodeId];

            // Incoming connections (pointing to this node)
            const incomingConnections = graphState.connections.filter(c => c.to === nodeId);
            
            // Outgoing connections (starting from this node)
            const outgoingConnections = graphState.connections.filter(c => c.from === nodeId);

            // Node details
            const nodeDetails = {
                id: node.id,
                type: node.type,
                position: { x: node.x, y: node.y },
                properties: node.data,
                incomingConnections: incomingConnections.map(conn => ({
                    from: conn.from,
                    fromLabel: graphState.nodes[conn.from].data.name || graphState.nodes[conn.from].type,
                    fromType: graphState.nodes[conn.from].type
                })),
                outgoingConnections: outgoingConnections.map(conn => ({
                    to: conn.to,
                    toLabel: graphState.nodes[conn.to].data.name || graphState.nodes[conn.to].type,
                    toType: graphState.nodes[conn.to].type
                }))
            };
            let vNode = verifyNode(nodeDetails)
            if (vNode != -256){
                verifyErrors.push(vNode);
            }
        });
        if(verifyErrors.length == 0){
            showToast("Your model is valid and can be submitted for processing", "success");
            log("Your model is valid and can be submitted for processing", "success");
        }
        else{
            showToast(verifyErrors.length + " error(s) detected in your model", "error");
            for (let index = 0; index < verifyErrors.length; index++) {
                const element = verifyErrors[index];
                log('\t'+element, "error");
            }
        }
    }

});