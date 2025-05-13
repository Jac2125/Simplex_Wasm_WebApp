// web/ui.js
(function(){
  const addRowBtn    = document.getElementById('addRowBtn');
  const removeRowBtn = document.getElementById('removeRowBtn');
  const addColBtn    = document.getElementById('addColBtn');
  const removeColBtn = document.getElementById('removeColBtn');
  const headerRow    = document.getElementById('headerRow');
  const body         = document.getElementById('tableBody');
  const cContainer   = document.getElementById('cInputs');
  let varCount       = headerRow.children.length - 1; // b 제외

  // 숫자 유효성 체크
  function validateInput(e) {
    const v = e.target.value;
    e.target.classList.toggle('invalid', v.trim()==='' || isNaN(Number(v)));
  }
  function bindCell(cell) {
    cell.addEventListener('input', validateInput);
  }

  // c 입력칸 초기화
  function initCInputs(count) {
    cContainer.innerHTML = '';
    for (let i = 1; i <= count; i++) {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'cell num cCell';
      inp.placeholder = `c${i}`;
      bindCell(inp);
      cContainer.appendChild(inp);
    }
  }
  initCInputs(varCount);

  // 기존 매트릭스 셀 바인딩
  document.querySelectorAll('#matrixTable .cell').forEach(bindCell);

  // 행 추가/제거
  addRowBtn.addEventListener('click', () => {
    const cols = headerRow.children.length;
    const tr = document.createElement('tr');
    for (let i = 0; i < cols; i++) {
      const td = document.createElement('td');
      const inp = document.createElement('input');
      inp.type = 'text'; inp.className = 'cell num';
      bindCell(inp);
      td.appendChild(inp);
      tr.appendChild(td);
    }
    body.appendChild(tr);
  });
  removeRowBtn.addEventListener('click', () => {
    if (body.rows.length > 1) body.deleteRow(-1);
  });

  // 열 추가/제거
  addColBtn.addEventListener('click', () => {
    varCount++;
    // 헤더
    const th = document.createElement('th');
    th.textContent = `x${varCount}`;
    headerRow.insertBefore(th, headerRow.lastElementChild);
    // 각 행
    Array.from(body.rows).forEach(tr => {
      const td = document.createElement('td');
      const inp = document.createElement('input');
      inp.type = 'text'; inp.className = 'cell num';
      bindCell(inp);
      td.appendChild(inp);
      tr.insertBefore(td, tr.lastElementChild);
    });
    // c 입력란
    const cInp = document.createElement('input');
    cInp.type = 'text'; cInp.className = 'cell num cCell';
    cInp.placeholder = `c${varCount}`;
    bindCell(cInp);
    cContainer.appendChild(cInp);
  });
  removeColBtn.addEventListener('click', () => {
    if (headerRow.children.length > 2) {
      headerRow.removeChild(headerRow.children[headerRow.children.length-2]);
      Array.from(body.rows).forEach(tr => {
        tr.removeChild(tr.children[tr.children.length-2]);
      });
      cContainer.removeChild(cContainer.lastChild);
      varCount--;
    }
  });

  // --- 여기서부터 핵심: run_simplex 바인딩 & 호출 ---
  Module.onRuntimeInitialized = () => {
    // 1) C 함수 포인터 시그니처 바인딩: 포인터 넘기기 위해 'number' 타입 사용
    const runSimplex = Module.cwrap(
      'run_simplex',
      'string',
      ['number','number','number','number','number']
    );

    document.getElementById('solveBtn').addEventListener('click', () => {
      // 2) 화면에서 A, b, c 읽어오기
      const A = [], bArr = [];
      document.querySelectorAll('#matrixTable tbody tr').forEach(tr => {
        const vals = Array.from(tr.querySelectorAll('input')).map(i => Number(i.value) || 0);
        // 앞 varCount개는 A, 마지막 하나는 b
        A.push(vals.slice(0, varCount));
        bArr.push(vals[varCount]);
      });
      const cArr = Array.from(document.querySelectorAll('.cCell'))
                        .map(i => Number(i.value) || 0);

      console.log('입력 → A:', A, 'b:', bArr, 'c:', cArr);

      // 3) 1차원 flat + Wasm 메모리 할당
      const aFlat = A.flat();
      const BYTES = Float64Array.BYTES_PER_ELEMENT;
      const ptrA  = Module._malloc(aFlat.length * BYTES);
      const ptrB  = Module._malloc(bArr.length    * BYTES);
      const ptrC  = Module._malloc(cArr.length    * BYTES);

      // 4) HEAPF64 뷰에 실제 숫자 복사
      const heapF64 = Module.HEAPF64;
      heapF64.set(aFlat, ptrA / BYTES);
      heapF64.set(bArr, ptrB / BYTES);
      heapF64.set(cArr, ptrC / BYTES);

      // 5) C++ 함수 호출 (문자열 포인터 반환 → JS 문자열)
      let json;
      try {
        json = runSimplex(ptrA, ptrB, ptrC, A.length, varCount);
        console.log('WASM → JSON:', json);
      } catch (e) {
        console.error('run_simplex 호출 에러', e);
        Module._free(ptrA); Module._free(ptrB); Module._free(ptrC);
        return;
      }

      // 6) 메모리 해제
      Module._free(ptrA);
      Module._free(ptrB);
      Module._free(ptrC);

      // 7) 결과 파싱 및 화면 표시
      let res;
      try {
        res = JSON.parse(json);
      } catch (e) {
        return console.error('JSON 파싱 에러', e);
      }
      const out = document.getElementById('output');
      out.textContent = res.feasible
        ? `최적값: ${res.objective}\n해: [${res.solution.join(', ')}]`
        : '해가 없거나(unbounded) 문제입니다.';
    });
  };
})();