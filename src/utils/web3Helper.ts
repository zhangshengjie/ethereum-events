/*
 * @Description: 
 * @Version: 1.0
 * @Autor: z.cejay@gmail.com
 * @Date: 2022-09-14 15:06:50
 * @LastEditors: cejay
 * @LastEditTime: 2022-09-14 15:06:50
 */

import Web3 from "web3";

export class Web3Helper {
    private static _web3: Web3;

    public static init(provider: string) {
        this._web3 = new Web3(provider);
    }

    public static get web3(): Web3 {
        if (!this._web3) {
            throw new Error("web3 is not initialized");
        }
        return this._web3;
    }
}