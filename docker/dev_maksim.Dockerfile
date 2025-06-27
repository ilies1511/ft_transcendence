# FROM debian:latest


# # basic tools
# RUN apt-get update && apt-get install -y \
#   git curl build-essential cmake sudo

# #install node
# #RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
# RUN curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
# RUN apt install nodejs -y
# #RUN npm install -g typescript --save-dev



# #RUN npm install -g typescript typescript-language-server

# ARG USERNAME=maksimvolkmann
# # ARG USERNAME=mvolkman
# ARG UID=1000
# ARG GID=1000
# RUN groupadd -g $GID $USERNAME
# RUN useradd  -u $UID -g $GID -m $USERNAME
# RUN echo "$USERNAME ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/$USERNAME
# RUN chown -R $UID:$GID /usr/local /opt /home/$USERNAME



# USER $USERNAME
# ENV HOME=/home/$USERNAME
# WORKDIR /home/$USERNAME/app
# CMD ["bash"]


FROM debian:latest

# Basic tools
RUN apt-get update && apt-get install -y \
  git curl build-essential cmake sudo && \
  rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Build arguments with safe defaults
ARG USERNAME=maksimvolkmann
ARG UID=1000
ARG GID=1000

# Create group and user only when necessary
RUN set -eux; \
    # Check if GID already exists, if not create the group
    if ! getent group "${GID}" > /dev/null 2>&1; then \
        groupadd -g "${GID}" "${USERNAME}"; \
        echo "Created group ${USERNAME} with GID ${GID}"; \
    else \
        echo "GID ${GID} already exists, will use existing group"; \
    fi && \
    # Check if UID already exists, if not create the user
    if ! getent passwd "${UID}" > /dev/null 2>&1; then \
        useradd -m -u "${UID}" -g "${GID}" -s /bin/bash "${USERNAME}"; \
        echo "Created user ${USERNAME} with UID ${UID}"; \
    else \
        echo "UID ${UID} already exists, creating alias user"; \
        useradd -M -o -g "${GID}" -s /bin/bash "${USERNAME}" 2>/dev/null || true; \
    fi && \
    # Add user to sudoers
    echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/"${USERNAME}" && \
    chmod 0440 /etc/sudoers.d/"${USERNAME}" && \
    # Set ownership of common directories
    chown -R "${UID}:${GID}" /home/"${USERNAME}" 2>/dev/null || true

USER ${USERNAME}
ENV HOME=/home/${USERNAME}
WORKDIR /home/${USERNAME}/app
CMD ["bash"]
