/*
 * @Description: 
 * @Version: 1.0
 * @Autor: z.cejay@gmail.com
 * @Date: 2022-08-08 21:58:13
 * @LastEditors: cejay
 * @LastEditTime: 2022-09-14 21:37:51
 */
import YAML from 'yaml'
import fs from 'fs';
import Web3 from 'web3';
import { ContractConfig } from '../entity/contractConfig';
import { Web3Helper } from './web3Helper';

export class YamlConfig {

    private static instance: YamlConfig;

    public web3Provider = {
        provider: 'https://',
        web3Instance: new Web3()
    };

    public mysql = {
        host: "127.0.0.1",
        port: 3306,
        user: "root",
        password: "pwd",
        database: "dbname",
        charset: "utf8mb4",
        table: "tablename",
    };

    public contractConfigs: ContractConfig[] = [];

    private constructor() {
        let yamlPath = '';
        if (fs.existsSync('/root/config.yaml')) {
            yamlPath = '/root/config.yaml'
        } else {
            console.log('no config file specified, use default config file: ../config.yaml');
            yamlPath = 'config.yaml';//console.log('current path: ' + process.cwd());
        }
        const yamlContent = fs.readFileSync(yamlPath, 'utf8');
        const yamlObj = YAML.parse(yamlContent);


        // check config

        //# web3 config
        if (!yamlObj.web3) throw new Error('web3 config not found');
        if (!yamlObj.web3.provider) throw new Error('web3::provider not found');
        if (typeof (yamlObj.web3.provider) !== 'string') throw new Error('web3::provider not string');
        {
            this.web3Provider.provider = yamlObj.web3.provider;
            Web3Helper.init(this.web3Provider.provider);
            this.web3Provider.web3Instance = Web3Helper.web3;

        }

        //# mysql config
        if (!yamlObj.mysql) throw new Error('mysql config not found');
        if (!yamlObj.mysql.host) throw new Error('mysql::host not found');
        if (typeof (yamlObj.mysql.host) !== 'string') throw new Error('mysql::host not string');
        if (!yamlObj.mysql.port) throw new Error('mysql::port not found');
        if (typeof (yamlObj.mysql.port) !== 'number') throw new Error('mysql::port not number');
        if (!yamlObj.mysql.user) throw new Error('mysql::user not found');
        if (typeof (yamlObj.mysql.user) !== 'string') throw new Error('mysql::user not string');
        if (!yamlObj.mysql.password) throw new Error('mysql::password not found');
        if (typeof (yamlObj.mysql.password) !== 'string') throw new Error('mysql::password not string');
        if (!yamlObj.mysql.database) throw new Error('mysql::database not found');
        if (typeof (yamlObj.mysql.database) !== 'string') throw new Error('mysql::database not string');
        if (!yamlObj.mysql.table) throw new Error('mysql::table not found');
        if (!yamlObj.mysql.charset) throw new Error('mysql::charset not found');
        if (typeof (yamlObj.mysql.charset) !== 'string') throw new Error('mysql::charset not string');
        if (typeof (yamlObj.mysql.table) !== 'string') throw new Error('mysql::table not string');
        {
            this.mysql.host = yamlObj.mysql.host;
            this.mysql.port = yamlObj.mysql.port;
            this.mysql.user = yamlObj.mysql.user;
            this.mysql.password = yamlObj.mysql.password;
            this.mysql.database = yamlObj.mysql.database;
            this.mysql.charset = yamlObj.mysql.charset;
            this.mysql.table = yamlObj.mysql.table;
        }



        //# contracts event config 
        if (!yamlObj.contracts) throw new Error('contracts config not found');
        if (!yamlObj.contracts.length) throw new Error('contracts config not found');
        for (let i = 0; i < yamlObj.contracts.length; i++) {
            const contract = yamlObj.contracts[i];
            if (!contract.name) throw new Error('contracts::name not found');
            if (!contract.address) throw new Error('contracts::address not found');
            if (typeof (contract.address) !== 'string') throw new Error('contracts::address not string');
            if (!this.web3Provider.web3Instance.utils.isAddress(contract.address)) throw new Error('contracts::address not valid');
            if (!contract.abi) throw new Error('contracts::abi not found');
            if (typeof (contract.abi) !== 'string') throw new Error('contracts::abi not string');
            // check abi
            const abiStr = fs.readFileSync(contract.abi, 'utf8');
            const abi = JSON.parse(abiStr);
            if (!abi) throw new Error('contracts::abi not found');
            const contractInstance = new this.web3Provider.web3Instance.eth.Contract(abi, contract.address);

            if (!contract.events) throw new Error('contracts::events not found');
            if (!Array.isArray(contract.events)) throw new Error('contracts::events not found');
            for (let j = 0; j < contract.events.length; j++) {
                const event = contract.events[j];
                if (!event) throw new Error('contracts::event not found');
            }
            if (!contract.startBlock) throw new Error('contracts::startBlock not found');
            if (typeof (contract.startBlock) !== 'number') throw new Error('contracts::startBlock not number');
            if (!contract.step) throw new Error('contracts::step not found');
            if (typeof (contract.step) !== 'number') throw new Error('contracts::step not number');
            if (!contract.interval) throw new Error('contracts::interval not found');
            if (typeof (contract.interval) !== 'number') throw new Error('contracts::interval not number');
           
            {
                this.contractConfigs.push(
                    new ContractConfig(
                        contract.name,
                        contract.address.toLowerCase(),
                        contractInstance,
                        contract.events,
                        contract.startBlock,
                        contract.step,
                        contract.interval
                    )
                );
            }
        }






    }

    public static getInstance() {
        if (!YamlConfig.instance) {
            YamlConfig.instance = new YamlConfig();
        }
        return YamlConfig.instance;
    }

}