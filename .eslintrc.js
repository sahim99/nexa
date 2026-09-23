module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: "MemberExpression[object.name='process'][property.name='env']",
            message: 'Direct access to process.env is forbidden. Use getSecret() from @nexa/credentials instead.'
          }
        ],
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'openai',
                message: 'LLM SDKs may only be imported inside packages/llm/src/providers/'
              },
              {
                name: 'groq-sdk',
                message: 'LLM SDKs may only be imported inside packages/llm/src/providers/'
              },
              {
                name: '@huggingface/inference',
                message: 'LLM SDKs may only be imported inside packages/llm/src/providers/'
              }
            ]
          }
        ]
      }
    },
    {
      // Allow process.env strictly in credentials broker and config files
      files: [
        'packages/credentials/src/**',
        '**/vite.config.*',
        '**/vitest.config.*',
        '**/next.config.*',
        'scripts/**'
      ],
      rules: {
        'no-restricted-syntax': 'off'
      }
    },
    {
      // Allow LLM SDK imports only inside packages/llm/src/providers
      files: ['packages/llm/src/providers/**'],
      rules: {
        'no-restricted-imports': 'off'
      }
    }
  ]
};
