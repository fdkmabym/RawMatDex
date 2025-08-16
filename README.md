# RawMatDex

A blockchain-powered decentralized marketplace for raw materials that enhances transparency, reduces intermediaries, and ensures ethical sourcing and fair trading — all on-chain.

---

## Overview

RawMatDex addresses real-world challenges in the raw materials industry, such as supply chain opacity, counterfeit products, volatile pricing, and unethical sourcing. By leveraging blockchain, it enables suppliers (e.g., miners, farmers) and buyers (e.g., manufacturers) to trade materials like metals, minerals, or agricultural commodities directly. Transactions are automated, provenance is verifiable via NFTs, and smart contracts handle escrow and payments securely.

The platform consists of four main smart contracts that form a transparent and efficient ecosystem:

1. **Material Token Contract** – Issues and manages fungible tokens representing standardized units of raw materials.
2. **Certification NFT Contract** – Mints NFTs for batch certification, tracking origin and quality.
3. **Marketplace Contract** – Facilitates listings, auctions, and direct sales of materials.
4. **Escrow and Oracle Contract** – Handles secure payments with escrow and integrates off-chain data for verification and pricing.

---

## Features

- **Tokenized raw materials** for easy trading and fractional ownership  
- **NFT-based certification** for provenance and anti-counterfeiting  
- **Decentralized marketplace** with auctions and fixed-price listings  
- **Automated escrow** for trustless transactions  
- **Oracle integration** for real-time pricing and supply verification  
- **Ethical sourcing tracking** to ensure sustainability compliance  
- **Reduced fees** by eliminating middlemen  
- **Transparent audit trails** for all trades and certifications  

---

## Smart Contracts

### Material Token Contract
- Mint and burn tokens representing raw materials (e.g., 1 token = 1 kg of copper)
- Transfer and staking mechanisms for liquidity providers
- Supply cap and standardization rules for different material types

### Certification NFT Contract
- Mint NFTs for material batches with metadata (origin, quality tests, sustainability certifications)
- Update NFT metadata for supply chain events (e.g., shipping updates)
- Transfer NFTs alongside physical deliveries for verification

### Marketplace Contract
- Create listings for material sales (auctions or fixed-price)
- Handle bids, purchases, and transfers of tokens/NFTs
- Royalty fees for platform sustainability

### Escrow and Oracle Contract
- Secure escrow for payments, releasing funds upon delivery confirmation
- Integrate with oracles for external data (e.g., market prices, delivery verification)
- Dispute resolution mechanisms tied to oracle proofs

---

## Installation

1. Install [Clarinet CLI](https://docs.hiro.so/clarinet/getting-started)
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/rawmatdex.git
   ```
3. Run tests:
    ```bash
    npm test
    ```
4. Deploy contracts:
    ```bash
    clarinet deploy
    ```

## Usage

Each smart contract operates independently but integrates with others for a complete marketplace experience.
Refer to individual contract documentation for function calls, parameters, and usage examples.

## License

MIT License