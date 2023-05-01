export type KeyElement = string | number | symbol;

export type Node<T> = {
  children: Record<KeyElement, Node<T>>;
  value: T | null;
};

export class TrieError extends Error {}

export class Trie<T> {
  root: Node<T>;
  constructor() {
    this.root = createNode();
  }

  set(key: KeyElement[], value: T): void {
    if (!Array.isArray(key)) {
      key = [key];
    }
    if (key.length === 0) {
      throw new TrieError("Trie.set: key has no elements");
    }

    let node = this.root;
    for (let i = 0; i < key.length; i++) {
      const k = key[i];
      if (!(k in node.children)) {
        node.children[k] = createNode();
      }
      node = node.children[k];
    }
    node.value = value;
  }

  get(key: KeyElement[]): T | null {
    if (!Array.isArray(key)) {
      throw new TrieError("Trie.get: key is not an array");
    }
    if (key.length === 0) {
      throw new TrieError("Trie.get: key has no elements");
    }

    let node = this.root;
    for (let i = 0; i < key.length; i++) {
      const k = key[i];
      if (!(k in node.children)) {
        return null;
      }
      node = node.children[k];
    }
    return node.value;
  }

  getRange(key: KeyElement[]): T[] {
    const result: T[] = [];
    function dfs(node: Node<T>, path: KeyElement[]): void {
      if (node.value !== null) {
        result.push(node.value);
      }
      for (const k in node.children) {
        const child = node.children[k];
        dfs(child, [...path, k]);
      }
    }

    let node = this.root;
    for (let i = 0; i < key.length; i++) {
      const k = key[i];
      if (!(k in node.children)) {
        return result;
      }
      node = node.children[k];
    }

    dfs(node, key);
    return result;
  }

  delete(key: KeyElement[]): void {
    deleteHelp(this.root, key, 0);
  }
}

function createNode<T>(): Node<T> {
  return {
    children: Object.create(null),
    value: null,
  };
}

function deleteHelp<T>(node: Node<T>, key: KeyElement[], index: number): boolean {
  if (index === key.length) {
    return isLeafNode(node);
  }

  const k = key[index];
  if (!(k in node.children)) {
    return false;
  }

  const child = node.children[k];
  const shouldDeleteChild = deleteHelp(child, key, index + 1);

  if (shouldDeleteChild) {
    delete node.children[k];
    return isLeafNode(node);
  }

  return false;
}

function isLeafNode<T>(node: Node<T>): boolean {
  return Object.keys(node.children).length === 0;
}