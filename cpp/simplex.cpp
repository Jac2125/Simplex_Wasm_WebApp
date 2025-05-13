// simplex.cpp
#include "simplex.hpp"
#include <string>
#include <cstdlib>
#include <cstring>
#include <limits>

// Simplex 계산 로직 (이전 구현 내용)
SimplexResult compute_simplex(double* A, double* b, double* c, int m, int n) {
    int rows = m + 1;
    int cols = n + m + 1;
    std::vector<std::vector<double>> T(rows, std::vector<double>(cols, 0.0));
    for (int i = 0; i < m; ++i) {
        for (int j = 0; j < n; ++j) T[i][j] = A[i * n + j];
        T[i][n + i] = 1.0;
        T[i][cols - 1] = b[i];
    }
    for (int j = 0; j < n; ++j) T[m][j] = -c[j];
    T[m][cols - 1] = 0.0;
    std::vector<int> basis(m);
    for (int i = 0; i < m; ++i) basis[i] = n + i;
    while (true) {
        int pivot_col = -1;
        for (int j = 0; j < cols - 1; ++j) if (T[m][j] < -1e-9) { pivot_col = j; break; }
        if (pivot_col < 0) break;
        double min_ratio = std::numeric_limits<double>::infinity();
        int pivot_row = -1;
        for (int i = 0; i < m; ++i) {
            if (T[i][pivot_col] > 1e-9) {
                double ratio = T[i][cols - 1] / T[i][pivot_col];
                if (ratio < min_ratio) { min_ratio = ratio; pivot_row = i; }
            }
        }
        if (pivot_row < 0) return { {}, 0.0, false };
        double pv = T[pivot_row][pivot_col];
        for (int j = 0; j < cols; ++j) T[pivot_row][j] /= pv;
        for (int i = 0; i < rows; ++i) if (i != pivot_row) {
            double factor = T[i][pivot_col];
            for (int j = 0; j < cols; ++j) T[i][j] -= factor * T[pivot_row][j];
        }
        basis[pivot_row] = pivot_col;
    }
    std::vector<double> x(n, 0.0);
    for (int i = 0; i < m; ++i) if (basis[i] < n) x[basis[i]] = T[i][cols - 1];
    return { x, T[m][cols - 1], true };
}

// 결과를 JSON 문자열로 변환
static std::string to_json(const SimplexResult& res) {
    std::string s = "{\"feasible\":" + std::string(res.feasible ? "true" : "false");
    s += ",\"objective\":" + std::to_string(res.objective);
    s += ",\"solution\":[";
    for (size_t i = 0; i < res.solution.size(); ++i) {
        if (i) s += ',';
        s += std::to_string(res.solution[i]);
    }
    s += "]}";
    return s;
}

// C 인터페이스 구현
char* run_simplex(double* A, double* b, double* c, int m, int n) {
    SimplexResult res = compute_simplex(A, b, c, m, n);
    std::string json = to_json(res);
    char* out = (char*)std::malloc(json.size() + 1);
    std::memcpy(out, json.c_str(), json.size() + 1);
    return out;
}
