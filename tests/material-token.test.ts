 
import { describe, it, expect, beforeEach } from "vitest";

type Material = {
	name: string;
	symbol: string;
	decimals: number;
	maxSupply: bigint;
	totalSupply: bigint;
};

type Result<T> = { value: T } | { error: number };

interface MockContract {
	admin: string;
	paused: boolean;
	nextTokenId: bigint;
	materials: Map<bigint, Material>;
	balances: Map<string, bigint>; // Key: `${owner}-${tokenId}`
	staked: Map<string, bigint>; // Key: `${owner}-${tokenId}`
	allowances: Map<string, bigint>; // Key: `${owner}-${spender}-${tokenId}`
	MAX_SUPPLY_EXAMPLE: bigint; // Placeholder for compatibility

	isAdmin(caller: string): boolean;
	validateAddress(addr: string): boolean;
	setPaused(caller: string, pause: boolean): Result<boolean>;
	createMaterial(
		caller: string,
		name: string,
		symbol: string,
		decimals: number,
		maxSupply: bigint
	): Result<bigint>;
	mint(
		caller: string,
		tokenId: bigint,
		recipient: string,
		amount: bigint
	): Result<boolean>;
	burn(caller: string, tokenId: bigint, amount: bigint): Result<boolean>;
	transfer(
		caller: string,
		tokenId: bigint,
		recipient: string,
		amount: bigint
	): Result<boolean>;
	approve(
		caller: string,
		tokenId: bigint,
		spender: string,
		amount: bigint
	): Result<boolean>;
	transferFrom(
		caller: string,
		tokenId: bigint,
		owner: string,
		recipient: string,
		amount: bigint
	): Result<boolean>;
	stake(caller: string, tokenId: bigint, amount: bigint): Result<boolean>;
	unstake(caller: string, tokenId: bigint, amount: bigint): Result<boolean>;
	getBalance(account: string, tokenId: bigint): Result<bigint>;
	getStaked(account: string, tokenId: bigint): Result<bigint>;
	getAllowance(owner: string, spender: string, tokenId: bigint): Result<bigint>;
	getTotalSupply(tokenId: bigint): Result<bigint>;
	getMaterialMetadata(tokenId: bigint): Material | undefined;
	getAdmin(): Result<string>;
	isPaused(): Result<boolean>;
	getNextTokenId(): Result<bigint>;
}

const mockContract: MockContract = {
	admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
	paused: false,
	nextTokenId: 1n,
	materials: new Map<bigint, Material>(),
	balances: new Map<string, bigint>(),
	staked: new Map<string, bigint>(),
	allowances: new Map<string, bigint>(),
	MAX_SUPPLY_EXAMPLE: 100_000_000n,

	isAdmin(caller: string) {
		return caller === this.admin;
	},

	validateAddress(addr: string) {
		return addr !== "SP000000000000000000002Q6VF78";
	},

	setPaused(caller: string, pause: boolean): Result<boolean> {
		if (!this.isAdmin(caller)) return { error: 100 };
		this.paused = pause;
		return { value: pause };
	},

	createMaterial(
		caller: string,
		name: string,
		symbol: string,
		decimals: number,
		maxSupply: bigint
	): Result<bigint> {
		if (!this.isAdmin(caller)) return { error: 100 };
		if (maxSupply <= 0n) return { error: 108 };
		const tokenId = this.nextTokenId;
		if (this.materials.has(tokenId)) return { error: 107 };
		this.materials.set(tokenId, {
			name,
			symbol,
			decimals,
			maxSupply,
			totalSupply: 0n,
		});
		this.nextTokenId += 1n;
		return { value: tokenId };
	},

	mint(
		caller: string,
		tokenId: bigint,
		recipient: string,
		amount: bigint
	): Result<boolean> {
		if (!this.isAdmin(caller)) return { error: 100 };
		if (!this.validateAddress(recipient)) return { error: 105 };
		if (amount <= 0n) return { error: 108 };
		const material = this.materials.get(tokenId);
		if (!material) return { error: 106 };
		const newSupply = material.totalSupply + amount;
		if (newSupply > material.maxSupply) return { error: 103 };
		material.totalSupply = newSupply;
		const balKey = `${recipient}-${tokenId}`;
		this.balances.set(balKey, (this.balances.get(balKey) || 0n) + amount);
		return { value: true };
	},

	burn(caller: string, tokenId: bigint, amount: bigint): Result<boolean> {
		if (this.paused) return { error: 104 };
		if (amount <= 0n) return { error: 108 };
		const material = this.materials.get(tokenId);
		if (!material) return { error: 106 };
		const balKey = `${caller}-${tokenId}`;
		const balance = this.balances.get(balKey) || 0n;
		if (balance < amount) return { error: 101 };
		this.balances.set(balKey, balance - amount);
		material.totalSupply -= amount;
		return { value: true };
	},

	transfer(
		caller: string,
		tokenId: bigint,
		recipient: string,
		amount: bigint
	): Result<boolean> {
		if (this.paused) return { error: 104 };
		if (!this.validateAddress(recipient)) return { error: 105 };
		if (amount <= 0n) return { error: 108 };
		if (!this.materials.has(tokenId)) return { error: 106 };
		const senderKey = `${caller}-${tokenId}`;
		const senderBal = this.balances.get(senderKey) || 0n;
		if (senderBal < amount) return { error: 101 };
		this.balances.set(senderKey, senderBal - amount);
		const recipKey = `${recipient}-${tokenId}`;
		this.balances.set(recipKey, (this.balances.get(recipKey) || 0n) + amount);
		return { value: true };
	},

	approve(
		caller: string,
		tokenId: bigint,
		spender: string,
		amount: bigint
	): Result<boolean> {
		if (this.paused) return { error: 104 };
		if (!this.validateAddress(spender)) return { error: 105 };
		if (!this.materials.has(tokenId)) return { error: 106 };
		const allowKey = `${caller}-${spender}-${tokenId}`;
		this.allowances.set(allowKey, amount);
		return { value: true };
	},

	transferFrom(
		caller: string,
		tokenId: bigint,
		owner: string,
		recipient: string,
		amount: bigint
	): Result<boolean> {
		if (this.paused) return { error: 104 };
		if (!this.validateAddress(recipient)) return { error: 105 };
		if (amount <= 0n) return { error: 108 };
		if (!this.materials.has(tokenId)) return { error: 106 };
		const allowKey = `${owner}-${caller}-${tokenId}`;
		const allowance = this.allowances.get(allowKey) || 0n;
		if (allowance < amount) return { error: 110 };
		const ownerKey = `${owner}-${tokenId}`;
		const ownerBal = this.balances.get(ownerKey) || 0n;
		if (ownerBal < amount) return { error: 101 };
		this.allowances.set(allowKey, allowance - amount);
		this.balances.set(ownerKey, ownerBal - amount);
		const recipKey = `${recipient}-${tokenId}`;
		this.balances.set(recipKey, (this.balances.get(recipKey) || 0n) + amount);
		return { value: true };
	},

	stake(caller: string, tokenId: bigint, amount: bigint): Result<boolean> {
		if (this.paused) return { error: 104 };
		if (amount <= 0n) return { error: 108 };
		if (!this.materials.has(tokenId)) return { error: 106 };
		const balKey = `${caller}-${tokenId}`;
		const balance = this.balances.get(balKey) || 0n;
		if (balance < amount) return { error: 101 };
		this.balances.set(balKey, balance - amount);
		const stakeKey = `${caller}-${tokenId}`;
		this.staked.set(stakeKey, (this.staked.get(stakeKey) || 0n) + amount);
		return { value: true };
	},

	unstake(caller: string, tokenId: bigint, amount: bigint): Result<boolean> {
		if (this.paused) return { error: 104 };
		if (amount <= 0n) return { error: 108 };
		if (!this.materials.has(tokenId)) return { error: 106 };
		const stakeKey = `${caller}-${tokenId}`;
		const stakeBal = this.staked.get(stakeKey) || 0n;
		if (stakeBal < amount) return { error: 102 };
		this.staked.set(stakeKey, stakeBal - amount);
		const balKey = `${caller}-${tokenId}`;
		this.balances.set(balKey, (this.balances.get(balKey) || 0n) + amount);
		return { value: true };
	},

	getBalance(account: string, tokenId: bigint): Result<bigint> {
		return { value: this.balances.get(`${account}-${tokenId}`) || 0n };
	},

	getStaked(account: string, tokenId: bigint): Result<bigint> {
		return { value: this.staked.get(`${account}-${tokenId}`) || 0n };
	},

	getAllowance(
		owner: string,
		spender: string,
		tokenId: bigint
	): Result<bigint> {
		return {
			value: this.allowances.get(`${owner}-${spender}-${tokenId}`) || 0n,
		};
	},

	getTotalSupply(tokenId: bigint): Result<bigint> {
		const material = this.materials.get(tokenId);
		if (!material) return { error: 106 };
		return { value: material.totalSupply };
	},

	getMaterialMetadata(tokenId: bigint): Material | undefined {
		return this.materials.get(tokenId);
	},

	getAdmin(): Result<string> {
		return { value: this.admin };
	},

	isPaused(): Result<boolean> {
		return { value: this.paused };
	},

	getNextTokenId(): Result<bigint> {
		return { value: this.nextTokenId };
	},
};

describe("RawMatDex Material Token", () => {
	beforeEach(() => {
		mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
		mockContract.paused = false;
		mockContract.nextTokenId = 1n;
		mockContract.materials = new Map();
		mockContract.balances = new Map();
		mockContract.staked = new Map();
		mockContract.allowances = new Map();
	});

	it("should create a new material when called by admin", () => {
		const result = mockContract.createMaterial(
			mockContract.admin,
			"Copper",
			"CU",
			6,
			100000000n
		);
		expect(result).toEqual({ value: 1n });
		expect(mockContract.materials.get(1n)).toEqual({
			name: "Copper",
			symbol: "CU",
			decimals: 6,
			maxSupply: 100000000n,
			totalSupply: 0n,
		});
		expect(mockContract.getNextTokenId()).toEqual({ value: 2n });
	});

	it("should fail to create material with zero max supply", () => {
		const result = mockContract.createMaterial(
			mockContract.admin,
			"Copper",
			"CU",
			6,
			0n
		);
		expect(result).toEqual({ error: 108 });
	});

	it("should fail to create material if not admin", () => {
		const result = mockContract.createMaterial(
			"ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT",
			"Copper",
			"CU",
			6,
			100000000n
		);
		expect(result).toEqual({ error: 100 });
	});

	it("should mint tokens for a material", () => {
		mockContract.createMaterial(
			mockContract.admin,
			"Copper",
			"CU",
			6,
			100000000n
		);
		const result = mockContract.mint(
			mockContract.admin,
			1n,
			"ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT",
			1000n
		);
		expect(result).toEqual({ value: true });
		expect(
			mockContract.balances.get("ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT-1")
		).toBe(1000n);
		expect(mockContract.getTotalSupply(1n)).toEqual({ value: 1000n });
	});

	it("should prevent minting over max supply", () => {
		mockContract.createMaterial(
			mockContract.admin,
			"Copper",
			"CU",
			6,
			100000000n
		);
		const result = mockContract.mint(
			mockContract.admin,
			1n,
			"ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT",
			200000000n
		);
		expect(result).toEqual({ error: 103 });
	});

	it("should burn tokens", () => {
		mockContract.createMaterial(
			mockContract.admin,
			"Copper",
			"CU",
			6,
			100000000n
		);
		mockContract.mint(
			mockContract.admin,
			1n,
			"ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT",
			500n
		);
		const result = mockContract.burn(
			"ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT",
			1n,
			200n
		);
		expect(result).toEqual({ value: true });
		expect(
			mockContract.balances.get("ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT-1")
		).toBe(300n);
		expect(mockContract.getTotalSupply(1n)).toEqual({ value: 300n });
	});

	it("should transfer tokens", () => {
		mockContract.createMaterial(
			mockContract.admin,
			"Copper",
			"CU",
			6,
			100000000n
		);
		mockContract.mint(
			mockContract.admin,
			1n,
			"ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT",
			500n
		);
		const result = mockContract.transfer(
			"ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT",
			1n,
			"ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP",
			200n
		);
		expect(result).toEqual({ value: true });
		expect(
			mockContract.balances.get("ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT-1")
		).toBe(300n);
		expect(
			mockContract.balances.get("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP-1")
		).toBe(200n);
	});

	it("should approve and transfer from", () => {
		mockContract.createMaterial(
			mockContract.admin,
			"Copper",
			"CU",
			6,
			100000000n
		);
		mockContract.mint(
			mockContract.admin,
			1n,
			"ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT",
			500n
		);
		mockContract.approve(
			"ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT",
			1n,
			"ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP",
			300n
		);
		const result = mockContract.transferFrom(
			"ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP",
			1n,
			"ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT",
			"ST4QTXP4NT2A8MQXKYNA9SY0HYBXM5T6T6HRAZQR",
			200n
		);
		expect(result).toEqual({ value: true });
		expect(
			mockContract.balances.get("ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT-1")
		).toBe(300n);
		expect(
			mockContract.balances.get("ST4QTXP4NT2A8MQXKYNA9SY0HYBXM5T6T6HRAZQR-1")
		).toBe(200n);
		expect(
			mockContract.allowances.get(
				"ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT-ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP-1"
			)
		).toBe(100n);
	});

	it("should stake tokens", () => {
		mockContract.createMaterial(
			mockContract.admin,
			"Copper",
			"CU",
			6,
			100000000n
		);
		mockContract.mint(
			mockContract.admin,
			1n,
			"ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT",
			500n
		);
		const result = mockContract.stake(
			"ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT",
			1n,
			200n
		);
		expect(result).toEqual({ value: true });
		expect(
			mockContract.balances.get("ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT-1")
		).toBe(300n);
		expect(
			mockContract.staked.get("ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT-1")
		).toBe(200n);
	});

	it("should unstake tokens", () => {
		mockContract.createMaterial(
			mockContract.admin,
			"Copper",
			"CU",
			6,
			100000000n
		);
		mockContract.mint(
			mockContract.admin,
			1n,
			"ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT",
			500n
		);
		mockContract.stake("ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT", 1n, 200n);
		const result = mockContract.unstake(
			"ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT",
			1n,
			100n
		);
		expect(result).toEqual({ value: true });
		expect(
			mockContract.staked.get("ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT-1")
		).toBe(100n);
		expect(
			mockContract.balances.get("ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT-1")
		).toBe(400n);
	});

	it("should not allow operations when paused", () => {
		mockContract.setPaused(mockContract.admin, true);
		const result = mockContract.transfer(
			"ST2CY5V39NHDP5PWEYNE3GTTEVFRQBFX0GD1D0YQT",
			1n,
			"ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP",
			10n
		);
		expect(result).toEqual({ error: 104 });
	});

	it("should return correct admin", () => {
		expect(mockContract.getAdmin()).toEqual({ value: mockContract.admin });
	});

	it("should return correct paused state", () => {
		expect(mockContract.isPaused()).toEqual({ value: false });
		mockContract.setPaused(mockContract.admin, true);
		expect(mockContract.isPaused()).toEqual({ value: true });
	});
});