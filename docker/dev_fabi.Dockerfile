FROM debian:latest


# basic tools
RUN apt-get update && apt-get install -y \
  git curl build-essential cmake sudo

#install node
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt install nodejs -y
RUN npm install -g typescript

# Clipboard helpers for Neovim ---------------------
RUN apt-get update && apt-get install -y \
    wl-clipboard

#dependencies for my nvim config
RUN apt-get install -y cargo
RUN apt-get install -y ripgrep
RUN apt-get install -y zip
RUN apt-get install -y wget
RUN apt-get install -y fd-find

# nvim install
RUN git clone https://github.com/neovim/neovim.git
RUN cd neovim \
	&& make CMAKE_BUILD_TYPE=RelWithDebInfo \
	&& make install

ARG USERNAME=fabi
ARG UID=1000
ARG GID=1000
RUN groupadd -g $GID $USERNAME && \
    useradd  -u $UID -g $GID -m $USERNAME && \
    echo "$USERNAME ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/$USERNAME && \
    chown -R $UID:$GID /usr/local /opt /home/$USERNAME

USER $USERNAME
ENV HOME=/home/$USERNAME
WORKDIR /home/$USERNAME/app
CMD ["bash"]

