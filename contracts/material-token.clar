;; RawMatDex Material Token Contract
;; Clarity v2
;; Implements multi-material fungible tokens with mint, burn, transfer, staking for liquidity,
;; supply caps per material, admin controls, and SIP-10 compliant interfaces.

(define-trait material-token-trait
  (
    (get-balance (principal uint) (response uint uint))
    (get-total-supply (uint) (response uint uint))
    (transfer (uint principal principal uint) (response bool uint))
    (mint (uint principal uint) (response bool uint))
    (burn (uint principal uint) (response bool uint))
  )
)

(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INSUFFICIENT-BALANCE u101)
(define-constant ERR-INSUFFICIENT-STAKE u102)
(define-constant ERR-MAX-SUPPLY-REACHED u103)
(define-constant ERR-PAUSED u104)
(define-constant ERR-ZERO-ADDRESS u105)
(define-constant ERR-INVALID-TOKEN-ID u106)
(define-constant ERR-TOKEN-ALREADY-EXISTS u107)
(define-constant ERR-INVALID-AMOUNT u108)
(define-constant ERR-NOT-OWNER u109)
(define-constant ERR-ALLOWANCE-INSUFFICIENT u110)

;; Token metadata structures
(define-map materials uint
  {
    name: (string-ascii 32),
    symbol: (string-ascii 10),
    decimals: uint,
    max-supply: uint,
    total-supply: uint
  }
)

;; Admin and contract state
(define-data-var admin principal tx-sender)
(define-data-var paused bool false)
(define-data-var next-token-id uint u1) ;; Starts from 1

;; Balances and stakes: multi-token support
(define-map balances { owner: principal, token-id: uint } uint)
(define-map staked-balances { owner: principal, token-id: uint } uint)
(define-map allowances { owner: principal, spender: principal, token-id: uint } uint)

;; Private helper: is-admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Private helper: ensure not paused
(define-private (ensure-not-paused)
  (asserts! (not (var-get paused)) (err ERR-PAUSED))
)

;; Private helper: validate address
(define-private (validate-address (addr principal))
  (not (is-eq addr 'SP000000000000000000002Q6VF78))
)

;; Private helper: get-material-or-fail
(define-private (get-material-or-fail (token-id uint))
  (match (map-get? materials token-id)
    some-material some-material
    (err ERR-INVALID-TOKEN-ID)
  )
)

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (validate-address new-admin) (err ERR-ZERO-ADDRESS))
    (var-set admin new-admin)
    (ok true)
  )
)

;; Pause/unpause the contract
(define-public (set-paused (pause bool))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (var-set paused pause)
    (ok pause)
  )
)

;; Create a new material type
(define-public (create-material (name (string-ascii 32)) (symbol (string-ascii 10)) (decimals uint) (max-supply uint))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (> max-supply u0) (err ERR-INVALID-AMOUNT))
    (let ((token-id (var-get next-token-id)))
      (asserts! (is-none (map-get? materials token-id)) (err ERR-TOKEN-ALREADY-EXISTS))
      (map-set materials token-id
        {
          name: name,
          symbol: symbol,
          decimals: decimals,
          max-supply: max-supply,
          total-supply: u0
        }
      )
      (var-set next-token-id (+ token-id u1))
      (ok token-id)
    )
  )
)

;; Mint new tokens for a specific material
(define-public (mint (token-id uint) (recipient principal) (amount uint))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (validate-address recipient) (err ERR-ZERO-ADDRESS))
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (let ((material (unwrap! (get-material-or-fail token-id) (err ERR-INVALID-TOKEN-ID)))
          (new-supply (+ (get total-supply material) amount)))
      (asserts! (<= new-supply (get max-supply material)) (err ERR-MAX-SUPPLY-REACHED))
      (map-set materials token-id (merge material { total-supply: new-supply }))
      (map-set balances { owner: recipient, token-id: token-id }
        (+ amount (default-to u0 (map-get? balances { owner: recipient, token-id: token-id }))))
      (ok true)
    )
  )
)

;; Burn tokens for a specific material
(define-public (burn (token-id uint) (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (let ((material (unwrap! (get-material-or-fail token-id) (err ERR-INVALID-TOKEN-ID)))
          (balance (default-to u0 (map-get? balances { owner: tx-sender, token-id: token-id }))))
      (asserts! (>= balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (map-set balances { owner: tx-sender, token-id: token-id } (- balance amount))
      (map-set materials token-id (merge material { total-supply: (- (get total-supply material) amount) }))
      (ok true)
    )
  )
)

;; Transfer tokens
(define-public (transfer (token-id uint) (recipient principal) (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (validate-address recipient) (err ERR-ZERO-ADDRESS))
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (unwrap! (get-material-or-fail token-id) (err ERR-INVALID-TOKEN-ID))
    (let ((sender-balance (default-to u0 (map-get? balances { owner: tx-sender, token-id: token-id }))))
      (asserts! (>= sender-balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (map-set balances { owner: tx-sender, token-id: token-id } (- sender-balance amount))
      (map-set balances { owner: recipient, token-id: token-id }
        (+ amount (default-to u0 (map-get? balances { owner: recipient, token-id: token-id }))))
      (ok true)
    )
  )
)

;; Approve spender allowance
(define-public (approve (token-id uint) (spender principal) (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (validate-address spender) (err ERR-ZERO-ADDRESS))
    (unwrap! (get-material-or-fail token-id) (err ERR-INVALID-TOKEN-ID))
    (map-set allowances { owner: tx-sender, spender: spender, token-id: token-id } amount)
    (ok true)
  )
)

;; Transfer from (using allowance)
(define-public (transfer-from (token-id uint) (owner principal) (recipient principal) (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (validate-address recipient) (err ERR-ZERO-ADDRESS))
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (unwrap! (get-material-or-fail token-id) (err ERR-INVALID-TOKEN-ID))
    (let ((allowance (default-to u0 (map-get? allowances { owner: owner, spender: tx-sender, token-id: token-id })))
          (owner-balance (default-to u0 (map-get? balances { owner: owner, token-id: token-id }))))
      (asserts! (>= allowance amount) (err ERR-ALLOWANCE-INSUFFICIENT))
      (asserts! (>= owner-balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (map-set allowances { owner: owner, spender: tx-sender, token-id: token-id } (- allowance amount))
      (map-set balances { owner: owner, token-id: token-id } (- owner-balance amount))
      (map-set balances { owner: recipient, token-id: token-id }
        (+ amount (default-to u0 (map-get? balances { owner: recipient, token-id: token-id }))))
      (ok true)
    )
  )
)

;; Stake tokens for liquidity providing
(define-public (stake (token-id uint) (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (unwrap! (get-material-or-fail token-id) (err ERR-INVALID-TOKEN-ID))
    (let ((balance (default-to u0 (map-get? balances { owner: tx-sender, token-id: token-id }))))
      (asserts! (>= balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (map-set balances { owner: tx-sender, token-id: token-id } (- balance amount))
      (map-set staked-balances { owner: tx-sender, token-id: token-id }
        (+ amount (default-to u0 (map-get? staked-balances { owner: tx-sender, token-id: token-id }))))
      (ok true)
    )
  )
)

;; Unstake tokens
(define-public (unstake (token-id uint) (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (unwrap! (get-material-or-fail token-id) (err ERR-INVALID-TOKEN-ID))
    (let ((stake-balance (default-to u0 (map-get? staked-balances { owner: tx-sender, token-id: token-id }))))
      (asserts! (>= stake-balance amount) (err ERR-INSUFFICIENT-STAKE))
      (map-set staked-balances { owner: tx-sender, token-id: token-id } (- stake-balance amount))
      (map-set balances { owner: tx-sender, token-id: token-id }
        (+ amount (default-to u0 (map-get? balances { owner: tx-sender, token-id: token-id }))))
      (ok true)
    )
  )
)

;; Read-only: get balance for token
(define-read-only (get-balance (account principal) (token-id uint))
  (ok (default-to u0 (map-get? balances { owner: account, token-id: token-id })))
)

;; Read-only: get staked balance for token
(define-read-only (get-staked (account principal) (token-id uint))
  (ok (default-to u0 (map-get? staked-balances { owner: account, token-id: token-id })))
)

;; Read-only: get allowance
(define-read-only (get-allowance (owner principal) (spender principal) (token-id uint))
  (ok (default-to u0 (map-get? allowances { owner: owner, spender: spender, token-id: token-id })))
)

;; Read-only: get total supply for token
(define-read-only (get-total-supply (token-id uint))
  (match (map-get? materials token-id)
    some-material (ok (get total-supply some-material))
    (err ERR-INVALID-TOKEN-ID)
  )
)

;; Read-only: get material metadata
(define-read-only (get-material-metadata (token-id uint))
  (map-get? materials token-id)
)

;; Read-only: get admin
(define-read-only (get-admin)
  (ok (var-get admin))
)

;; Read-only: check if paused
(define-read-only (is-paused)
  (ok (var-get paused))
)

;; Read-only: get next token id
(define-read-only (get-next-token-id)
  (ok (var-get next-token-id))
)