async function foo() {
  await import('./dynamic.js').then(module => {
    expect(module.value).toBe(1);
  });
}

void foo()

