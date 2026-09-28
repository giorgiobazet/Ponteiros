// Estado global da Memória
let memory = [];
let nextAddress = 100;

// Referências DOM
const board = document.getElementById('memory-board');
const logContainer = document.getElementById('log-container');

// Inicializa a memória limpa
window.onload = () => {
    log("Ambiente inicializado. Utilize o painel para declarar variáveis e ponteiros.", "normal");
};

function addVariable() {
    const name = document.getElementById('var-name').value.trim();
    const value = parseInt(document.getElementById('var-value').value);
    
    if(!name || isNaN(value)) return log("Erro: Nome ou valor inválido.", "error");
    if(memory.find(e => e.name === name)) return log(`Erro: Variável '${name}' já existe.`, "error");

    adicionarNaMemoria(name, 'int', value);
    document.getElementById('var-name').value = '';
    document.getElementById('var-value').value = '';
    log(`Variável int ${name} = ${value}; alocada no endereço ${nextAddress-1}.`, "success");
}

function addPointer() {
    const name = document.getElementById('ptr-name').value.trim();
    if(!name) return log("Erro: Nome inválido.", "error");
    if(memory.find(e => e.name === name)) return log(`Erro: Variável '${name}' já existe.`, "error");

    adicionarNaMemoria(name, 'int*');
    document.getElementById('ptr-name').value = '';
    log(`Ponteiro int* ${name}; alocado no endereço ${nextAddress-1}.`, "success");
}

function adicionarNaMemoria(name, type, value = null) {
    memory.push({
        name: name,
        type: type,
        address: nextAddress++,
        value: value,
        pointsTo: null
    });
    renderBoard(name);
}

function renderBoard(highlightName = null) {
    board.innerHTML = '';
    
    // Filtra as variáveis e ponteiros para renderização em secções distintas
    const vars = memory.filter(item => item.type === 'int');
    const ptrs = memory.filter(item => item.type === 'int*');

    // 1. Renderiza a secção de Variáveis (Parte de Cima)
    if (vars.length > 0) {
        const varsSection = document.createElement('div');
        varsSection.className = 'memory-section';
        varsSection.innerHTML = '<h4 class="section-title">Variáveis Normais</h4><div class="memory-grid" id="grid-vars"></div>';
        board.appendChild(varsSection);
        
        const gridVars = varsSection.querySelector('#grid-vars');
        vars.forEach(item => renderCell(item, gridVars, highlightName));
    }

    // 2. Renderiza a secção de Ponteiros (Parte de Baixo)
    if (ptrs.length > 0) {
        const ptrsSection = document.createElement('div');
        ptrsSection.className = 'memory-section';
        ptrsSection.innerHTML = '<h4 class="section-title">Ponteiros</h4><div class="memory-grid" id="grid-ptrs"></div>';
        board.appendChild(ptrsSection);
        
        const gridPtrs = ptrsSection.querySelector('#grid-ptrs');
        ptrs.forEach(item => renderCell(item, gridPtrs, highlightName));
    }

    if(highlightName) {
        setTimeout(() => renderBoard(), 400); // Remove o destaque da animação
    }
}

function renderCell(item, container, highlightName) {
    const isPtr = item.type === 'int*';
    let displayValue = item.value === null ? 'Lixo' : item.value;
    let pointsToHtml = '';

    if (isPtr && item.pointsTo) {
        pointsToHtml = `<span class="points-to-lbl">➔ Aponta para: ${item.pointsTo}</span>`;
    }

    const div = document.createElement('div');
    div.className = `memory-cell ${item.name === highlightName ? 'updated' : ''}`;
    div.innerHTML = `
        <div class="cell-header">
            <span class="var-name">${item.name}</span>
            <span class="var-type ${isPtr ? 'type-ptr' : 'type-int'}">${item.type}</span>
        </div>
        <div class="cell-content">
            ${displayValue}
            ${pointsToHtml}
        </div>
        <div class="address-tag">End: ${item.address}</div>
    `;
    container.appendChild(div);
}

function log(msg, type = "normal") {
    const p = document.createElement('div');
    p.className = `log-entry ${type === 'error' ? 'log-error' : type === 'success' ? 'log-success' : ''}`;
    p.innerText = `[LOG] ${msg}`;
    logContainer.prepend(p);
}

function getVar(name) {
    return memory.find(e => e.name === name);
}

function getVarByAddress(addr) {
    return memory.find(e => e.address === addr);
}

function executeCommand() {
    const inputField = document.getElementById('cmd-input');
    let cmd = inputField.value.replace(/\s+/g, '').replace(';', ''); 
    if(!cmd) return;

    inputField.value = '';

    let parts = cmd.split('=');
    if(parts.length !== 2) return log(`Erro de sintaxe em: ${cmd}`, "error");

    let leftSide = parts[0];
    let rightSide = parts[1];

    let targetVar = null;
    let isLeftDeref = false; 

    // Analisar Destino (Lado Esquerdo)
    if (leftSide.startsWith('*')) {
        isLeftDeref = true;
        let ptrName = leftSide.substring(1);
        let ptr = getVar(ptrName);
        if(!ptr || ptr.type !== 'int*') return log(`Erro: '${ptrName}' não é um ponteiro válido.`, "error");
        if(ptr.value === null) return log(`Erro: Segmentation Fault! O ponteiro '${ptrName}' não aponta para nenhum endereço.`, "error");
        
        targetVar = getVarByAddress(ptr.value);
    } else {
        targetVar = getVar(leftSide);
    }

    if (!targetVar) return log(`Erro: Variável de destino '${leftSide}' não declarada.`, "error");

    // Analisar Valor (Lado Direito)
    let finalValue = null;
    let pointsToName = null;

    if (rightSide.startsWith('&')) {
        let srcName = rightSide.substring(1);
        let srcVar = getVar(srcName);
        if(!srcVar) return log(`Erro: Variável '${srcName}' não declarada.`, "error");
        
        finalValue = srcVar.address;
        pointsToName = srcName;

    } else if (rightSide.startsWith('*')) {
        let srcName = rightSide.substring(1);
        let srcPtr = getVar(srcName);
        if(!srcPtr || srcPtr.type !== 'int*') return log(`Erro: '${srcName}' não é um ponteiro.`, "error");
        if(srcPtr.value === null) return log(`Erro: Segmentation Fault ao aceder a '*${srcName}'.`, "error");
        
        let pointedVar = getVarByAddress(srcPtr.value);
        finalValue = pointedVar.value;

    } else if (!isNaN(rightSide)) {
        finalValue = parseInt(rightSide);
    } else {
        let srcVar = getVar(rightSide);
        if(!srcVar) return log(`Erro: Variável '${rightSide}' não reconhecida.`, "error");
        
        finalValue = srcVar.value;
        pointsToName = srcVar.pointsTo;
    }

    // Aplicar a atribuição na memória
    targetVar.value = finalValue;
    if (targetVar.type === 'int*') {
        targetVar.pointsTo = pointsToName; 
    }

    log(`Comando processado com sucesso: ${cmd};`, "success");
    renderBoard(targetVar.name); 
}