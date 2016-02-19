FROM ubuntu:14.04
ADD ./ /root/Tangerine-server
RUN cd /root/Tangerine-server && cp tangerine-env-vars.sh.defaults tangerine-env-vars.sh && ./server-init.sh
VOLUME ["/usr/local/var/lib/couchdb"]
EXPOSE 80
ENTRYPOINT /root/Tangerine-server/container-start.sh 
