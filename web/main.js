// web/main.js

// ⚠️ index.html에서 꼭 아래 순서로 로드돼야 합니다.
// <script src="simplex.js"></script>
// <script src="main.js"></script>

Module.onRuntimeInitialized = () => {
  // C 인터페이스 바인딩 (string 반환)
  const runSimplex = Module.cwrap(
    'run_simplex',
    'string',
    ['number','number','number','number','number']
  );

  // 이제 HEAP 뷰가 분명히 존재합니다.
  const heapF64 = Module.HEAPF64;

  document.getElementById('solveBtn').addEventListener('click', () => {
    // 1) 입력 파싱
    const A    = parseMatrix(document.getElementById('matrixA').value);
    const b    = parseVector(document.getElementById('vectorB').value);
    const c    = parseVector(document.getElementById('vectorC').value);
    const rows = A.length, cols = A[0].length;
    const aFlat = A.flat();

    // 2) Wasm 메모리 할당
    const BYTES = Float64Array.BYTES_PER_ELEMENT;
    const ptrA  = Module._malloc(aFlat.length * BYTES);
    const ptrB  = Module._malloc(b.length   * BYTES);
    const ptrC  = Module._malloc(c.length   * BYTES);

    // 3) 데이터를 HEAPF64로 복사
    heapF64.set(aFlat, ptrA / BYTES);
    heapF64.set(b,     ptrB / BYTES);
    heapF64.set(c,     ptrC / BYTES);

    console.log('→ Calling run_simplex', { ptrA, ptrB, ptrC, rows, cols });

    // 4) 호출 & JSON 파싱
    let result;
    try {
      const json = runSimplex(ptrA, ptrB, ptrC, rows, cols);
      console.log('← WASM returned JSON:', json);
      result = JSON.parse(json);
    } catch (e) {
      console.error('run_simplex or JSON.parse failed:', e);
      Module._free(ptrA); Module._free(ptrB); Module._free(ptrC);
      return;
    }

    // 5) 결과 표시
    const out = document.getElementById('output');
    if (result.feasible) {
      out.textContent = `최적값: ${result.objective}\n해: [${result.solution.join(', ')}]`;
    } else {
      out.textContent = '해가 없거나(unbounded) 문제입니다.';
    }

    // 6) 메모리 해제
    Module._free(ptrA);
    Module._free(ptrB);
    Module._free(ptrC);
  });
};

// === 유틸 함수 ===
function parseMatrix(text) {
  return text.trim().split('\n').map(r => r.split(',').map(Number));
}
function parseVector(text) {
  return text.trim().split(',').map(Number);
}
