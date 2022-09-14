#!/bin/bash
###
 # @Description: 
 # @Version: 1.0
 # @Autor: z.cejay@gmail.com
 # @Date: 2022-09-09 20:08:09
 # @LastEditors: cejay
 # @LastEditTime: 2022-09-14 22:15:57
### 
echo 'start script'
cd /root/dist
pm2 start ./app.js
pm2 logs