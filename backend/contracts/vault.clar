;; StackSafe Vault: A dead man's switch contract on Stacks.

(define-data-var owner principal tx-sender)
(define-data-var nominee principal 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3KZJ273ANAFSF) ;; Placeholder
(define-data-var secret-hash (buff 32) 0x00) ;; Placeholder
(define-data-var heartbeat-interval uint u4320) ;; Placeholder, e.g., ~3 days
(define-data-var grace-period uint u1008) ;; Placeholder, e.g., ~1 week
(define-data-var last-ping-block uint block-height)

;; --- Errors ---
(define-constant ERR-UNAUTHORIZED (err u101))
(define-constant ERR-DEADLINE-NOT-PASSED (err u102))
(define-constant ERR-BAD-PROOF (err u103))
(define-constant ERR-NOTHING-TO-CLAIM (err u104))

;; --- Public Functions ---

(define-public (ping)
  (begin
    (asserts! (is-eq tx-sender (var-get owner)) ERR-UNAUTHORIZED)
    (var-set last-ping-block block-height)
    (ok true)
  )
)

(define-public (claim (salt (string-ascii 256)) (password (string-ascii 256)))
  (begin
    (asserts! (is-eq tx-sender (var-get nominee)) ERR-UNAUTHORIZED)

    (let ((provided-hash (sha256 (concat salt password))))
      (asserts! (is-eq provided-hash (var-get secret-hash)) ERR-BAD-PROOF)
    )

    (let ((deadline-block (+ (var-get last-ping-block) (var-get heartbeat-interval) (var-get grace-period))))
      (asserts! (> block-height deadline-block) ERR-DEADLINE-NOT-PASSED)
    )

    (let ((balance (stx-get-balance (as-contract tx-sender))))
      (asserts! (> balance u0) ERR-NOTHING-TO-CLAIM)
      (as-contract (stx-transfer? balance tx-sender (var-get nominee)))
    )
    
    (ok true)
  )
)
