import { CLASS, PropertyBehaviour } from "./spume.js";

const Thing = CLASS({})

const TestClass = CLASS({
    something: new PropertyBehaviour({
        adapt: v => ['inalist', v]
    }),
    abool: true,

    hello () {
        console.log('Hello');
    }
});

const o = new TestClass();
o.hello();
o.something = 5;
console.log('value', o.something)

console.log('abool', o.abool);
o.abool = null;
console.log('abool', o.abool);