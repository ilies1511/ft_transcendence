FROM debian:latest


# basic tools
RUN apt-get update && apt-get install -y \
  git curl build-essential cmake sudo

#install node
#RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
RUN apt install nodejs -y
#RUN npm install -g typescript --save-dev



#RUN npm install -g typescript typescript-language-server

ARG USERNAME=mvolkman
ARG UID=1000
ARG GID=1000
RUN groupadd -g $GID $USERNAME
RUN useradd  -u $UID -g $GID -m $USERNAME
RUN echo "$USERNAME ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/$USERNAME
RUN chown -R $UID:$GID /usr/local /opt /home/$USERNAME

# RUN mkdir -p /app/core/backend/src/data && \
#     touch /app/core/backend/src/data/pong.db

USER $USERNAME
ENV HOME=/home/$USERNAME
WORKDIR /home/$USERNAME/app
CMD ["bash"]
# CMD ["bash", "-c", "cd core && exec bash"]


