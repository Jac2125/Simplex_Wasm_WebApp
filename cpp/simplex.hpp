// simplex.hpp
#pragma once
#include <vector>

struct SimplexResult {
    std::vector<double> solution;  // 최적해 벡터
    double objective;               // 최적 목적값
    bool feasible;                  // 해 존재 여부
};

// 내부 C++용 계산 함수
SimplexResult compute_simplex(double* A, double* b, double* c, int m, int n);

// JavaScript에서 호출할 C 인터페이스 (JSON 문자열 포인터 반환)
extern "C" {
    // 반환: malloc으로 할당된 null-terminated JSON 문자열
    char* run_simplex(double* A, double* b, double* c, int m, int n);
}